-- Results from SEACE for bids in play, and the company's history by RUC.

-- 1. Detected results ---------------------------------------------------------
-- After each sync, every open bid whose process has an award gets one timeline event
-- "result_detected" per award. The company confirms it; we never change its status.

create unique index bid_events_result_detected_once
    on public.bid_events (bid_id, (data ->> 'awardId'))
    where type = 'result_detected';

create function public.detect_bid_results() returns int
language plpgsql
set search_path = ''
as $$
declare
    inserted_count int;
begin
    insert into public.bid_events (bid_id, organization_id, type, data)
    select b.id, b.organization_id, 'result_detected',
           jsonb_build_object(
               'awardId', a.id,
               'outcome', case
                   when a.supplier_ruc = o.ruc then 'won'
                   when b.status = 'submitted'
                        or exists (select 1 from public.tender_participants p
                                   where p.ocid = b.ocid and p.ruc = o.ruc) then 'lost'
                   else 'awarded_to_other'
               end,
               'winnerName', a.supplier_name,
               'winnerRuc', a.supplier_ruc,
               'amount', case
                   when a.supplier_ruc = o.ruc then (
                       select sum(own.amount) from public.awards own
                       where own.ocid = b.ocid and own.supplier_ruc = o.ruc)
                   else a.amount
               end,
               'awardDate', a.award_date
           )
    from public.bids b
    join public.organizations o on o.id = b.organization_id
    -- Several awards (one per item): the company's own award first, else the latest.
    join lateral (
        select aw.*
        from public.awards aw
        where aw.ocid = b.ocid
        order by (aw.supplier_ruc = o.ruc) desc nulls last, aw.award_date desc nulls last
        limit 1
    ) a on true
    where b.status in ('evaluating', 'preparing', 'submitted')
    on conflict (bid_id, (data ->> 'awardId')) where type = 'result_detected' do nothing;

    get diagnostics inserted_count = row_count;
    return inserted_count;
end;
$$;

revoke execute on function public.detect_bid_results() from public, anon, authenticated;
grant execute on function public.detect_bid_results() to service_role;

-- 2. History by RUC -----------------------------------------------------------
-- Every process where the company's RUC bid or won, to import as closed bids.
-- Security invoker: tenders' RLS applies (active subscription), and the RUC comes
-- from the caller's own organization, never from a parameter.
create function public.seace_history(p_organization_id uuid, p_limit int default 500)
returns table (
    ocid           text,
    title          text,
    description    text,
    buyer_name     text,
    date_published timestamptz,
    amount         numeric,
    currency       text,
    outcome        text, -- won | lost | pending
    awarded_amount numeric,
    already_tracked boolean
)
language sql stable
set search_path = ''
as $$
    with org as (
        select o.id, o.ruc from public.organizations o
        where o.id = p_organization_id and public.is_org_member(o.id)
    ),
    processes as (
        select p.ocid from public.tender_participants p, org where p.ruc = org.ruc
        union
        select a.ocid from public.awards a, org where a.supplier_ruc = org.ruc
    )
    select t.ocid, t.title, t.description, t.buyer_name, t.date_published, t.amount, t.currency,
           case
               when exists (select 1 from public.awards a, org where a.ocid = t.ocid and a.supplier_ruc = org.ruc) then 'won'
               when exists (select 1 from public.awards a where a.ocid = t.ocid) then 'lost'
               else 'pending'
           end,
           (select sum(a.amount) from public.awards a, org where a.ocid = t.ocid and a.supplier_ruc = org.ruc),
           exists (select 1 from public.bids b where b.organization_id = p_organization_id and b.ocid = t.ocid)
    from processes pr
    join public.tenders t on t.ocid = pr.ocid
    order by t.date_published desc nulls last
    limit least(greatest(p_limit, 1), 1000);
$$;

revoke execute on function public.seace_history(uuid, int) from public, anon;
grant execute on function public.seace_history(uuid, int) to authenticated, service_role;
