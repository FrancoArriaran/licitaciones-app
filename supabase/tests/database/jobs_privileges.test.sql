-- What the jobs (service_role) can do, and that customers can't do the same.
begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

insert into public.mype_profiles (company_name, whatsapp_phone, business_description, unspsc_families, status)
values ('Prototipo SAC', '51987654321', 'Vende cemento', '{3011}', 'active');
insert into public.tenders (ocid, title, department, amount, unspsc_family, date_published)
values ('ocds-job-1', 'Cemento', 'LIMA', 1000, '3011', now() - interval '1 day');

set local role service_role;

select is(public.refresh_tender_matches(), 1, 'jobs refresh prototype matches');
select is(public.refresh_tender_matches(), 0, 'refreshing twice creates no duplicates');
select lives_ok('select public.refresh_alert_matches()', 'jobs refresh customer matches');
select lives_ok(
    $$insert into public.tenders (ocid, title) values ('ocds-job-2', 'x')
      on conflict (ocid) do update set title = excluded.title$$,
    'jobs upsert tenders');
select lives_ok(
    $$insert into public.sync_runs (year, month, tenders_upserted, documents_upserted, status)
      values (2026, 11, 1, 0, 'ok')$$,
    'jobs log sync runs');
select lives_ok('select * from public.pending_alert_notifications', 'jobs read the notification queue');

reset role;
set local role authenticated;

select throws_ok('select public.refresh_tender_matches()', '42501', null,
    'customers cannot run the prototype matching');

reset role;

select * from finish();
rollback;
