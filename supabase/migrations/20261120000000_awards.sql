-- Awards and items from SEACE, for "la última contratación similar": who won a
-- comparable process, at what price, and against how many bidders.
-- Loaded by the sync job (apps/jobs) from the same monthly OCDS file as tenders.

alter table public.tenders add column number_of_tenderers int;
alter table public.sync_runs add column awards_upserted int not null default 0;

-- What each process buys. cubso_code is SEACE's 16-digit product code (the most
-- specific); unspsc_code is the 8-digit commodity.
create table public.tender_items (
    ocid           text not null references public.tenders (ocid) on delete cascade,
    item_id        text not null,
    position       int,
    description    text,
    cubso_code     text,
    unspsc_code    text,
    quantity       numeric,
    unit_name      text,
    amount         numeric,
    status_details text,
    updated_at     timestamptz not null default now(),
    primary key (ocid, item_id)
);

create index tender_items_cubso_idx on public.tender_items (cubso_code);
create index tender_items_unspsc_idx on public.tender_items (unspsc_code);

create table public.awards (
    id            text primary key,
    ocid          text not null references public.tenders (ocid) on delete cascade,
    award_date    timestamptz,
    amount        numeric,
    currency      text,
    supplier_id   text,
    supplier_name text,
    supplier_ruc  text, -- null for consortia, which SEACE identifies with an internal id
    updated_at    timestamptz not null default now()
);

create index awards_ocid_idx on public.awards (ocid);
create index awards_supplier_ruc_idx on public.awards (supplier_ruc);

create table public.award_items (
    award_id    text not null references public.awards (id) on delete cascade,
    item_id     text not null,
    ocid        text not null references public.tenders (ocid) on delete cascade,
    description text,
    cubso_code  text,
    unspsc_code text,
    quantity    numeric,
    unit_name   text,
    amount      numeric,
    updated_at  timestamptz not null default now(),
    primary key (award_id, item_id)
);

create index award_items_cubso_idx on public.award_items (cubso_code);
create index award_items_unspsc_idx on public.award_items (unspsc_code);
create index award_items_ocid_idx on public.award_items (ocid);

-- Most recent awards of other processes that bought the same product (same CUBSO
-- code: match_level 'product') or, failing that, the same kind of thing (same
-- UNSPSC commodity: 'category'). Security invoker: tenders' RLS applies, so only
-- customers with an active subscription (and staff) get rows.
create function public.last_similar_awards(p_ocid text, p_limit int default 3)
returns table (
    match_level         text,
    ocid                text,
    title               text,
    tender_description  text,
    buyer_name          text,
    department          text,
    award_date          timestamptz,
    supplier_name       text,
    supplier_ruc        text,
    item_description    text,
    quantity            numeric,
    unit_name           text,
    amount              numeric,
    unit_price          numeric,
    currency            text,
    number_of_tenderers int
)
language sql stable
set search_path = ''
as $$
    with mine as (
        select distinct ti.cubso_code, ti.unspsc_code
        from public.tender_items ti
        where ti.ocid = p_ocid
    ),
    candidates as (
        select case when ai.cubso_code in (select m.cubso_code from mine m where m.cubso_code is not null)
                    then 'product' else 'category' end as match_level,
               ai.ocid, ai.description, ai.quantity, ai.unit_name, ai.amount,
               a.award_date, a.supplier_name, a.supplier_ruc, a.currency
        from public.award_items ai
        join public.awards a on a.id = ai.award_id
        where ai.ocid <> p_ocid
          and (ai.cubso_code in (select m.cubso_code from mine m where m.cubso_code is not null)
               or ai.unspsc_code in (select m.unspsc_code from mine m where m.unspsc_code is not null))
    )
    select c.match_level, c.ocid, t.title, t.description, t.buyer_name, t.department,
           c.award_date, c.supplier_name, c.supplier_ruc, c.description, c.quantity,
           c.unit_name, c.amount,
           case when c.quantity > 0 and c.amount is not null then round(c.amount / c.quantity, 2) end,
           coalesce(c.currency, t.currency), t.number_of_tenderers
    from candidates c
    join public.tenders t on t.ocid = c.ocid
    order by (c.match_level = 'product') desc, c.award_date desc nulls last
    limit least(greatest(p_limit, 1), 20);
$$;

-- Privileges ---------------------------------------------------------------

revoke execute on function public.last_similar_awards(text, int) from public, anon;
grant execute on function public.last_similar_awards(text, int) to authenticated, service_role;

grant select on public.tender_items, public.awards, public.award_items to authenticated;
grant select, insert, update, delete on public.tender_items, public.awards, public.award_items
to service_role;
revoke all on public.tender_items, public.awards, public.award_items from anon;

-- RLS: public procurement data, readable like tenders --------------------------

alter table public.tender_items enable row level security;
alter table public.awards enable row level security;
alter table public.award_items enable row level security;

create policy tender_items_select on public.tender_items
    for select to authenticated
    using (public.has_active_subscription() or public.is_platform_admin());
create policy awards_select on public.awards
    for select to authenticated
    using (public.has_active_subscription() or public.is_platform_admin());
create policy award_items_select on public.award_items
    for select to authenticated
    using (public.has_active_subscription() or public.is_platform_admin());
