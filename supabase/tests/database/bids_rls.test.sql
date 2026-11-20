-- Postulaciones and their files: isolation between companies, roles, read-only when
-- the subscription expired, and an immutable timeline.
begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

-- Fixtures ------------------------------------------------------------------
insert into auth.users (id, email) values
    ('00000000-0000-0000-0000-0000000000a1', 'owner@a.pe'),
    ('00000000-0000-0000-0000-0000000000a2', 'member@a.pe'),
    ('00000000-0000-0000-0000-0000000000b1', 'owner@b.pe'),
    ('00000000-0000-0000-0000-0000000000c1', 'owner@c.pe');

insert into public.organizations (id, name, ruc) values
    ('20000000-0000-0000-0000-0000000000aa', 'Empresa A SAC', '20131312955'),
    ('20000000-0000-0000-0000-0000000000bb', 'Empresa B SAC', '20505120451'),
    ('20000000-0000-0000-0000-0000000000cc', 'Empresa C SAC', '20100070970');

insert into public.subscriptions (organization_id, plan_code, status, starts_at, ends_at, max_seats) values
    ('20000000-0000-0000-0000-0000000000aa', 'essential', 'active', now() - interval '1 day', now() + interval '1 year', 3),
    ('20000000-0000-0000-0000-0000000000bb', 'essential', 'active', now() - interval '1 day', now() + interval '1 year', 1),
    ('20000000-0000-0000-0000-0000000000cc', 'essential', 'active', now() - interval '1 year', now() - interval '1 day', 1);

insert into public.memberships (organization_id, user_id, role, email, joined_at) values
    ('20000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-0000000000a1', 'owner', 'owner@a.pe', now()),
    ('20000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-0000000000a2', 'member', 'member@a.pe', now()),
    ('20000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-0000000000b1', 'owner', 'owner@b.pe', now()),
    ('20000000-0000-0000-0000-0000000000cc', '00000000-0000-0000-0000-0000000000c1', 'owner', 'owner@c.pe', now());

insert into public.tenders (ocid, title) values ('ocds-bid-1', 'SIE-1'), ('ocds-bid-2', 'SIE-2');

-- Company C's bid, created while its subscription was active.
insert into public.bids (id, organization_id, ocid) values
    ('40000000-0000-0000-0000-0000000000cc', '20000000-0000-0000-0000-0000000000cc', 'ocds-bid-1');

create function pg_temp.login_as(user_id uuid) returns void language sql as $$
    select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
    set local role authenticated;
$$;

-- A member works on bids ---------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a2');

select lives_ok(
    $$insert into public.bids (id, organization_id, ocid, created_by) values
      ('40000000-0000-0000-0000-0000000000aa', '20000000-0000-0000-0000-0000000000aa', 'ocds-bid-1',
       '00000000-0000-0000-0000-0000000000a2')$$,
    'a member can follow an opportunity');
select throws_ok(
    $$insert into public.bids (organization_id, ocid) values ('20000000-0000-0000-0000-0000000000aa', 'ocds-bid-1')$$,
    '23505', null, 'a company follows each process once');
select throws_ok(
    $$insert into public.bids (organization_id, ocid) values ('20000000-0000-0000-0000-0000000000bb', 'ocds-bid-2')$$,
    '42501', null, 'nobody creates bids for another company');
select lives_ok(
    $$update public.bids set status = 'submitted', offered_amount = 41000
      where id = '40000000-0000-0000-0000-0000000000aa'$$,
    'a member records the offer');
select throws_ok(
    $$update public.bids set awarded_amount = 41000 where id = '40000000-0000-0000-0000-0000000000aa'$$,
    '23514', null, 'an awarded amount only goes with a won bid');
select lives_ok(
    $$insert into public.bid_events (bid_id, organization_id, type, actor_id) values
      ('40000000-0000-0000-0000-0000000000aa', '20000000-0000-0000-0000-0000000000aa', 'note',
       '00000000-0000-0000-0000-0000000000a2')$$,
    'a member adds to the timeline as themself');
select throws_ok(
    $$insert into public.bid_events (bid_id, organization_id, type, actor_id) values
      ('40000000-0000-0000-0000-0000000000aa', '20000000-0000-0000-0000-0000000000aa', 'note',
       '00000000-0000-0000-0000-0000000000a1')$$,
    '42501', null, 'nobody writes in the timeline as someone else');
select throws_ok(
    $$update public.bid_events set type = 'created'$$,
    '42501', null, 'the timeline cannot be edited');
delete from public.bids where id = '40000000-0000-0000-0000-0000000000aa';
select is((select count(*) from public.bids where organization_id = '20000000-0000-0000-0000-0000000000aa')::int, 1,
    'members cannot delete bids');

-- Files ----------------------------------------------------------------------
select throws_ok(
    $$insert into public.bid_documents (bid_id, organization_id, storage_path, name, size_bytes) values
      ('40000000-0000-0000-0000-0000000000aa', '20000000-0000-0000-0000-0000000000aa',
       '20000000-0000-0000-0000-0000000000bb/bids/40000000-0000-0000-0000-0000000000aa/x.pdf', 'x.pdf', 10)$$,
    '42501', null, 'document metadata must point inside its own bid folder');
select lives_ok(
    $$insert into storage.objects (bucket_id, name) values
      ('org-files', '20000000-0000-0000-0000-0000000000aa/bids/40000000-0000-0000-0000-0000000000aa/oferta.pdf')$$,
    'a member uploads into their company folder');

reset role;
select pg_temp.login_as('00000000-0000-0000-0000-0000000000b1');

select is((select count(*) from public.bids)::int, 0, 'another company sees none of its bids');
select is((select count(*) from public.bid_events)::int, 0, 'nor their timeline');
select is((select count(*) from storage.objects where bucket_id = 'org-files')::int, 0, 'nor their files');
select throws_ok(
    $$insert into storage.objects (bucket_id, name) values
      ('org-files', '20000000-0000-0000-0000-0000000000aa/bids/x/intruso.pdf')$$,
    '42501', null, 'nobody uploads into another company folder');
select throws_ok(
    $$insert into public.bid_events (bid_id, organization_id, type, actor_id) values
      ('40000000-0000-0000-0000-0000000000aa', '20000000-0000-0000-0000-0000000000bb', 'note',
       '00000000-0000-0000-0000-0000000000b1')$$,
    '42501', null, 'nobody attaches events to another company bid');

-- Expired subscription: read-only --------------------------------------------
reset role;
select pg_temp.login_as('00000000-0000-0000-0000-0000000000c1');

select is((select count(*) from public.bids)::int, 1, 'an expired company still sees its bids');
select throws_ok(
    $$insert into public.bids (organization_id, ocid) values ('20000000-0000-0000-0000-0000000000cc', 'ocds-bid-2')$$,
    '42501', null, 'but cannot create new ones');

-- Owners delete --------------------------------------------------------------
reset role;
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
delete from public.bids where id = '40000000-0000-0000-0000-0000000000aa';
select is((select count(*) from public.bids)::int, 0, 'owners can delete a bid');

reset role;
set local role anon;
select throws_ok('select * from public.bids', '42501', null, 'anonymous visitors cannot read bids');
reset role;

select * from finish();
rollback;
