-- Tenant isolation and role rules for the accounts tables (run with `supabase test db`).
begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

-- Fixtures (as the table owner, RLS off) ------------------------------------
insert into auth.users (id, email) values
    ('00000000-0000-0000-0000-00000000000a', 'owner-a@empresa-a.pe'),
    ('00000000-0000-0000-0000-00000000000b', 'owner-b@empresa-b.pe'),
    ('00000000-0000-0000-0000-00000000000c', 'member-a@empresa-a.pe'),
    ('00000000-0000-0000-0000-00000000000d', 'new-a@empresa-a.pe'),
    ('00000000-0000-0000-0000-00000000000e', 'staff@licitaciones.pe'),
    ('00000000-0000-0000-0000-00000000000f', 'other@empresa-a.pe');

insert into public.platform_admins (user_id) values ('00000000-0000-0000-0000-00000000000e');

insert into public.organizations (id, name, ruc) values
    ('10000000-0000-0000-0000-00000000000a', 'Empresa A SAC', '20131312955'),
    ('10000000-0000-0000-0000-00000000000b', 'Empresa B SAC', '20505120451');

insert into public.subscriptions (organization_id, plan_code, status, starts_at, ends_at, max_seats) values
    ('10000000-0000-0000-0000-00000000000a', 'professional', 'active', now() - interval '1 day', now() + interval '1 year', 3),
    ('10000000-0000-0000-0000-00000000000b', 'essential', 'active', now() - interval '1 year', now() - interval '1 day', 1);

insert into public.memberships (organization_id, user_id, role, email, joined_at) values
    ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'owner', 'owner-a@empresa-a.pe', now()),
    ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c', 'member', 'member-a@empresa-a.pe', null),
    ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'owner', 'owner-b@empresa-b.pe', now());

insert into public.tenders (ocid, title) values ('ocds-test-1', 'Adquisición de cemento');

create function pg_temp.login_as(user_id uuid) returns void language sql as $$
    select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
    set local role authenticated;
$$;

-- Owner of A ----------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-00000000000a');

select results_eq(
    'select name from public.organizations',
    $$ values ('Empresa A SAC') $$,
    'an owner sees only their own organization'
);
select is(
    (select count(*)::int from public.memberships where organization_id = '10000000-0000-0000-0000-00000000000b'),
    0,
    'an owner cannot see another organization''s members'
);
select is((select count(*)::int from public.tenders), 1, 'an active subscriber reads tenders');
select throws_ok(
    $$ insert into public.organizations (name, ruc) values ('Intrusa SAC', '20100047218') $$,
    '42501', null,
    'customers cannot create organizations'
);
select throws_ok(
    $$ insert into public.memberships (organization_id, user_id, role, email)
       values ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000d', 'member', 'new-a@empresa-a.pe') $$,
    '42501', null,
    'an owner cannot add members to another organization'
);
select lives_ok(
    $$ insert into public.memberships (organization_id, user_id, role, email)
       values ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000d', 'member', 'new-a@empresa-a.pe') $$,
    'an owner can invite into their own organization'
);
select results_eq(
    $$ select max_seats, used from public.seat_usage('10000000-0000-0000-0000-00000000000a') $$,
    $$ values (3, 3) $$,
    'seat usage counts joined and pending members'
);
-- An UPDATE filtered out by RLS affects zero rows instead of raising: check the data.
update public.subscriptions set ends_at = now() + interval '10 years';
reset role;
select ok(
    (select ends_at < now() + interval '2 years' from public.subscriptions
     where organization_id = '10000000-0000-0000-0000-00000000000a'),
    'customers cannot extend their own subscription'
);

-- Plain member of A ---------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-00000000000c');
select throws_ok(
    $$ insert into public.memberships (organization_id, user_id, role, email)
       values ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000f', 'member', 'other@empresa-a.pe') $$,
    '42501', null,
    'members cannot invite'
);
select lives_ok('select public.accept_pending_memberships()', 'an invited member can accept');
-- A DELETE filtered out by RLS affects zero rows instead of raising: check the data.
delete from public.memberships where user_id = '00000000-0000-0000-0000-00000000000d';
reset role;
select is(
    (select count(*)::int from public.memberships where user_id = '00000000-0000-0000-0000-00000000000d'),
    1,
    'members cannot remove teammates'
);
insert into public.leads (id, full_name, company_name, email, phone, sector, sells_to_government, source)
values ('40000000-0000-0000-0000-000000000001', 'Rosa', 'Prueba SAC', 'rosa@prueba.pe', '+51987654321', 'Cemento', 'no', 'demo_form');
select pg_temp.login_as('00000000-0000-0000-0000-00000000000e');
update public.leads set status = 'contacted' where id = '40000000-0000-0000-0000-000000000001';
reset role;
select is(
    (select status from public.leads where id = '40000000-0000-0000-0000-000000000001'),
    'contacted',
    'staff can move leads through the pipeline'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000000a');
delete from public.memberships where user_id = '00000000-0000-0000-0000-00000000000d';
reset role;
select is(
    (select count(*)::int from public.memberships where user_id = '00000000-0000-0000-0000-00000000000d'),
    0,
    'owners can remove teammates'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000000c');
reset role;
select isnt(
    (select joined_at from public.memberships where user_id = '00000000-0000-0000-0000-00000000000c'),
    null,
    'accepting sets joined_at'
);

-- Owner of B (expired subscription) -----------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.tenders), 0, 'an expired subscription hides tenders');
select is(public.has_active_subscription(), false, 'has_active_subscription is false once expired');
reset role;

-- Staff ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-00000000000e');
select is((select count(*)::int from public.organizations), 2, 'staff see every organization');
select lives_ok(
    $$ select public.create_organization('Nueva SAC', '20100047218', 'essential', 'trial',
                                         now(), now() + interval '14 days', 1) $$,
    'staff can create an organization with its subscription'
);
reset role;

-- Anonymous visitor ---------------------------------------------------------
set local role anon;
select throws_ok(
    'select count(*) from public.organizations',
    '42501', null,
    'anonymous visitors cannot read organizations'
);
select throws_ok(
    $$ insert into public.leads (full_name, company_name, email, phone, sector, sells_to_government, source)
       values ('Bot', 'Spam SAC', 'bot@spam.com', '+51987654321', 'spam', 'no', 'demo_form') $$,
    '42501', null,
    'anonymous visitors cannot write leads directly (only the captcha-checked server action can)'
);
reset role;

select * from finish();
rollback;
