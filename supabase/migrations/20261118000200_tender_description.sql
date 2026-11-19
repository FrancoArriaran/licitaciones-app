-- In SEACE data, tenders.title is the process code (e.g. "SIE-SIE-1-2026-MDSD-OEC-1")
-- and tenders.description is the readable text. Expose description where people read.

drop function public.preview_alert_profile(text[], text[], numeric, numeric, int);

create function public.preview_alert_profile(
    p_families text[],
    p_departments text[],
    p_min_amount numeric,
    p_max_amount numeric,
    p_days int default 30
) returns table (
    ocid text,
    title text,
    description text,
    buyer_name text,
    department text,
    amount numeric,
    currency text,
    date_published timestamptz,
    enquiry_end timestamptz,
    unspsc_description text
)
language sql stable
set search_path = ''
as $$
    select t.ocid, t.title, t.description, t.buyer_name, t.department, t.amount, t.currency,
           t.date_published, t.enquiry_end, t.unspsc_description
    from public.tenders t
    where public.tender_fits_profile(t, p_families, p_departments, p_min_amount, p_max_amount)
      and t.date_published >= now() - make_interval(days => p_days)
    order by t.date_published desc
    limit 50;
$$;

revoke execute on function public.preview_alert_profile(text[], text[], numeric, numeric, int)
    from public, anon;
grant execute on function public.preview_alert_profile(text[], text[], numeric, numeric, int)
    to authenticated;

-- New columns go at the end so CREATE OR REPLACE keeps the existing ones.
create or replace view public.pending_alert_notifications
with (security_invoker = true) as
select m.id              as match_id,
       m.organization_id,
       o.name            as organization_name,
       coalesce(ns.email_enabled, true)     as email_enabled,
       coalesce(ns.whatsapp_enabled, false) as whatsapp_enabled,
       ns.whatsapp_phone,
       coalesce(ns.digest_hour, 7)          as digest_hour,
       p.name            as profile_name,
       t.ocid, t.title, t.buyer_name, t.department, t.amount, t.currency,
       t.enquiry_end, t.date_published,
       m.matched_at,
       t.description
from public.alert_matches m
join public.organizations o on o.id = m.organization_id
join public.alert_profiles p on p.id = m.profile_id
join public.tenders t on t.ocid = m.ocid
left join public.notification_settings ns on ns.organization_id = m.organization_id
where m.notified_at is null;
