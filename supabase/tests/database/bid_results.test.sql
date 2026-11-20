-- Results detected from SEACE and the history by RUC.
begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

-- Fixtures ------------------------------------------------------------------
insert into auth.users (id, email) values
    ('00000000-0000-0000-0000-0000000000a1', 'owner@a.pe'),
    ('00000000-0000-0000-0000-0000000000b1', 'owner@b.pe');

insert into public.organizations (id, name, ruc) values
    ('20000000-0000-0000-0000-0000000000aa', 'Empresa A SAC', '20131312955'),
    ('20000000-0000-0000-0000-0000000000bb', 'Empresa B SAC', '20505120451');

insert into public.subscriptions (organization_id, plan_code, status, starts_at, ends_at, max_seats) values
    ('20000000-0000-0000-0000-0000000000aa', 'essential', 'active', now() - interval '1 day', now() + interval '1 year', 1),
    ('20000000-0000-0000-0000-0000000000bb', 'essential', 'active', now() - interval '1 day', now() + interval '1 year', 1);

insert into public.memberships (organization_id, user_id, role, email, joined_at) values
    ('20000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-0000000000a1', 'owner', 'owner@a.pe', now()),
    ('20000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-0000000000b1', 'owner', 'owner@b.pe', now());

insert into public.tenders (ocid, title, date_published) values
    ('t-won', 'SIE-1', now() - interval '30 days'),
    ('t-lost', 'SIE-2', now() - interval '20 days'),
    ('t-other', 'SIE-3', now() - interval '10 days'),
    ('t-pending', 'SIE-4', now() - interval '5 days'),
    ('t-closed', 'SIE-5', now() - interval '40 days'),
    ('t-history', 'SIE-6', now() - interval '200 days');

insert into public.awards (id, ocid, award_date, amount, supplier_name, supplier_ruc) values
    ('aw-won-1', 't-won', now() - interval '1 day', 1000, 'Empresa A SAC', '20131312955'),
    ('aw-won-2', 't-won', now(), 500, 'Otra SAC', '20100000009'),
    ('aw-lost', 't-lost', now(), 800, 'Rival SAC', '20100000008'),
    ('aw-other', 't-other', now(), 300, 'Rival SAC', '20100000008'),
    ('aw-closed', 't-closed', now(), 100, 'Empresa A SAC', '20131312955'),
    ('aw-history', 't-history', now() - interval '150 days', 2500, 'Empresa A SAC', '20131312955');

insert into public.tender_participants (ocid, party_id, ruc, name) values
    ('t-lost', 'PE-RUC-20131312955', '20131312955', 'Empresa A SAC'),
    ('t-lost', 'PE-RUC-20100000008', '20100000008', 'Rival SAC');

insert into public.bids (id, organization_id, ocid, status) values
    ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000000aa', 't-won', 'submitted'),
    ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-0000000000aa', 't-lost', 'preparing'),
    ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-0000000000aa', 't-other', 'evaluating'),
    ('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-0000000000aa', 't-pending', 'submitted'),
    ('40000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-0000000000aa', 't-closed', 'won');

create function pg_temp.outcome(bid uuid) returns text language sql as $$
    select data ->> 'outcome' from public.bid_events where bid_id = bid and type = 'result_detected'
$$;

-- Detection (as the sync job) ------------------------------------------------
set local role service_role;

select is(public.detect_bid_results(), 3, 'one result per open bid whose process was awarded');
select is(public.detect_bid_results(), 0, 'running it again adds nothing');
reset role;

select is(pg_temp.outcome('40000000-0000-0000-0000-000000000001'), 'won', 'the company RUC won one of the awards');
select is(
    (select (data ->> 'amount')::numeric from public.bid_events
     where bid_id = '40000000-0000-0000-0000-000000000001' and type = 'result_detected'),
    1000::numeric, 'a win carries the amount awarded to the company only');
select is(pg_temp.outcome('40000000-0000-0000-0000-000000000002'), 'lost', 'it bid (per SEACE) and someone else won');
select is(pg_temp.outcome('40000000-0000-0000-0000-000000000003'), 'awarded_to_other', 'it never bid and someone else won');
select is((select count(*) from public.bid_events where bid_id in
    ('40000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000005'))::int, 0,
    'nothing for processes without award or bids already closed');

-- History by RUC -------------------------------------------------------------
create function pg_temp.login_as(user_id uuid) returns void language sql as $$
    select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
    set local role authenticated;
$$;

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok('select public.detect_bid_results()', '42501', null, 'customers cannot run the detection');
select results_eq(
    $$select ocid, outcome, already_tracked from public.seace_history('20000000-0000-0000-0000-0000000000aa')
      where ocid in ('t-history', 't-lost')$$,
    $$values ('t-lost', 'lost', true), ('t-history', 'won', false)$$,
    'the history lists where it bid or won, and whether it is already tracked');
select is(
    (select awarded_amount from public.seace_history('20000000-0000-0000-0000-0000000000aa') where ocid = 't-history'),
    2500::numeric, 'with the amount it was awarded');
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-0000000000b1');
select is((select count(*) from public.seace_history('20000000-0000-0000-0000-0000000000aa'))::int, 0,
    'nobody reads the history of another company');
reset role;

select * from finish();
rollback;
