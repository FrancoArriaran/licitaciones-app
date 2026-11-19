-- Alert profiles, channels and matches: isolation, roles and matching rules.
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

-- Fixtures ------------------------------------------------------------------
insert into auth.users (id, email) values
    ('00000000-0000-0000-0000-0000000000a1', 'owner@a.pe'),
    ('00000000-0000-0000-0000-0000000000a2', 'member@a.pe'),
    ('00000000-0000-0000-0000-0000000000b1', 'owner@b.pe');

insert into public.organizations (id, name, ruc) values
    ('20000000-0000-0000-0000-0000000000aa', 'Ferretería A SAC', '20131312955'),
    ('20000000-0000-0000-0000-0000000000bb', 'Constructora B SAC', '20505120451');

insert into public.subscriptions (organization_id, plan_code, status, starts_at, ends_at, max_seats) values
    ('20000000-0000-0000-0000-0000000000aa', 'essential', 'active', now() - interval '1 day', now() + interval '1 year', 3),
    ('20000000-0000-0000-0000-0000000000bb', 'essential', 'active', now() - interval '1 year', now() - interval '1 day', 1);

insert into public.memberships (organization_id, user_id, role, email, joined_at) values
    ('20000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-0000000000a1', 'owner', 'owner@a.pe', now()),
    ('20000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-0000000000a2', 'member', 'member@a.pe', now()),
    ('20000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-0000000000b1', 'owner', 'owner@b.pe', now());

insert into public.tenders (ocid, title, department, amount, unspsc_family, date_published) values
    ('ocds-t-cemento', 'Cemento para veredas', 'AREQUIPA', 45000, '3011', now() - interval '2 days'),
    ('ocds-t-sin-monto', 'Cemento, sin valor publicado', 'AREQUIPA', 0, '3011', now() - interval '3 days'),
    ('ocds-t-lima', 'Cemento en Lima', 'LIMA', 45000, '3011', now() - interval '2 days'),
    ('ocds-t-caro', 'Cemento para represa', 'AREQUIPA', 900000, '3011', now() - interval '2 days'),
    ('ocds-t-viejo', 'Cemento antiguo', 'AREQUIPA', 45000, '3011', now() - interval '90 days');

insert into public.alert_profiles (id, organization_id, name, business_description, unspsc_families, departments, max_amount) values
    ('30000000-0000-0000-0000-0000000000aa', '20000000-0000-0000-0000-0000000000aa', 'Cemento Arequipa',
     'Vendemos cemento y agregados', array['3011'], array['AREQUIPA'], 100000),
    ('30000000-0000-0000-0000-0000000000bb', '20000000-0000-0000-0000-0000000000bb', 'Cemento B',
     'Construcción en general', array['3011'], '{}', null);

create function pg_temp.login_as(user_id uuid) returns void language sql as $$
    select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
    set local role authenticated;
$$;

-- Matching (as the sender job runs it) --------------------------------------
select is(public.refresh_alert_matches(), 2, 'refresh matches only active subscriptions, within region, range and window');
select results_eq(
    'select ocid from public.alert_matches order by ocid',
    $$ values ('ocds-t-cemento'), ('ocds-t-sin-monto') $$,
    'a tender without a published amount still matches the range'
);
select is(public.refresh_alert_matches(), 0, 'refreshing again creates no duplicates');

-- Owner of A ----------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select is((select count(*)::int from public.alert_profiles), 1, 'an owner sees only their own alert profiles');
select is((select count(*)::int from public.alert_matches), 2, 'an owner sees their own matches');
select lives_ok(
    $$ insert into public.alert_profiles (organization_id, name, business_description, unspsc_families)
       values ('20000000-0000-0000-0000-0000000000aa', 'Fierro', 'Vendemos fierro corrugado', array['3010']) $$,
    'an owner can create alert profiles'
);
select throws_ok(
    $$ insert into public.alert_profiles (organization_id, name, business_description, unspsc_families)
       values ('20000000-0000-0000-0000-0000000000bb', 'Intruso', 'Perfil en otra empresa', array['3010']) $$,
    '42501', null,
    'an owner cannot create profiles in another organization'
);
select throws_ok(
    $$ insert into public.notification_settings (organization_id, whatsapp_enabled, whatsapp_phone)
       values ('20000000-0000-0000-0000-0000000000aa', true, '+51987654321') $$,
    '23514', null,
    'WhatsApp cannot be enabled without a recorded consent'
);
select is(
    (select count(*)::int from public.preview_alert_profile(array['3011'], array['AREQUIPA'], null, 100000)),
    2,
    'the preview shows recent fitting tenders to an active subscriber'
);
reset role;

-- Member of A ---------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a2');
select is((select count(*)::int from public.alert_profiles), 2, 'members can read their organization''s profiles');
select throws_ok(
    $$ insert into public.alert_profiles (organization_id, name, business_description, unspsc_families)
       values ('20000000-0000-0000-0000-0000000000aa', 'Otro', 'Intento de un miembro', array['3010']) $$,
    '42501', null,
    'members cannot create alert profiles'
);
reset role;

-- Owner of B (expired) ------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-0000000000b1');
select is(
    (select count(*)::int from public.preview_alert_profile(array['3011'], '{}', null, null)),
    0,
    'an expired subscription gets an empty preview'
);
select throws_ok(
    'select count(*) from public.pending_alert_notifications',
    '42501', null,
    'customers cannot read the sender queue'
);
reset role;

-- Anonymous ------------------------------------------------------------------
set local role anon;
select throws_ok(
    'select count(*) from public.unspsc_families',
    '42501', null,
    'anonymous visitors cannot read the catalog'
);
reset role;

select * from finish();
rollback;
