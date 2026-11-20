-- "Última contratación similar": matching rules and who can see awards.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

-- Fixtures ------------------------------------------------------------------
insert into auth.users (id, email) values
    ('00000000-0000-0000-0000-0000000000c1', 'active@c.pe'),
    ('00000000-0000-0000-0000-0000000000d1', 'expired@d.pe');

insert into public.organizations (id, name, ruc) values
    ('20000000-0000-0000-0000-0000000000cc', 'Activa SAC', '20131312955'),
    ('20000000-0000-0000-0000-0000000000dd', 'Vencida SAC', '20505120451');

insert into public.subscriptions (organization_id, plan_code, status, starts_at, ends_at, max_seats) values
    ('20000000-0000-0000-0000-0000000000cc', 'essential', 'active', now() - interval '1 day', now() + interval '1 year', 1),
    ('20000000-0000-0000-0000-0000000000dd', 'essential', 'active', now() - interval '1 year', now() - interval '1 day', 1);

insert into public.memberships (organization_id, user_id, role, email, joined_at) values
    ('20000000-0000-0000-0000-0000000000cc', '00000000-0000-0000-0000-0000000000c1', 'owner', 'active@c.pe', now()),
    ('20000000-0000-0000-0000-0000000000dd', '00000000-0000-0000-0000-0000000000d1', 'owner', 'expired@d.pe', now());

insert into public.tenders (ocid, title, description, buyer_name, number_of_tenderers) values
    ('ocds-new', 'SIE-1', 'CEMENTO PORTLAND TIPO I', 'MUNICIPALIDAD A', null),
    ('ocds-same-product', 'SIE-2', 'CEMENTO PORTLAND', 'MUNICIPALIDAD B', 4),
    ('ocds-same-category', 'SIE-3', 'CEMENTO PUZOLANICO', 'MUNICIPALIDAD C', 2),
    ('ocds-unrelated', 'SIE-4', 'LAPTOPS', 'MUNICIPALIDAD D', 1);

insert into public.tender_items (ocid, item_id, cubso_code, unspsc_code, quantity) values
    ('ocds-new', '1', '3011160100000001', '30111601', 500);

insert into public.awards (id, ocid, award_date, amount, currency, supplier_name, supplier_ruc) values
    ('a-product', 'ocds-same-product', now() - interval '60 days', 13500, 'PEN', 'FERRETERIA SUR SAC', '20100000001'),
    ('a-category', 'ocds-same-category', now() - interval '10 days', 9000, 'PEN', 'CEMENTOS NORTE SAC', '20100000002'),
    ('a-unrelated', 'ocds-unrelated', now() - interval '1 day', 50000, 'PEN', 'TECNO SAC', '20100000003'),
    ('a-self', 'ocds-new', now(), 1, 'PEN', 'SELF', null);

insert into public.award_items (award_id, item_id, ocid, cubso_code, unspsc_code, quantity, amount) values
    ('a-product', '1', 'ocds-same-product', '3011160100000001', '30111601', 500, 13500),
    ('a-category', '1', 'ocds-same-category', '3011160100000099', '30111601', 300, 9000),
    ('a-unrelated', '1', 'ocds-unrelated', '4321150000000001', '43211500', 10, 50000),
    ('a-self', '1', 'ocds-new', '3011160100000001', '30111601', 1, 1);

create function pg_temp.login_as(user_id uuid) returns void language sql as $$
    select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
    set local role authenticated;
$$;

-- As a customer with an active subscription ----------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-0000000000c1');

select results_eq(
    $$select ocid, match_level from public.last_similar_awards('ocds-new')$$,
    $$values ('ocds-same-product', 'product'), ('ocds-same-category', 'category')$$,
    'same product first even if older, then same category; unrelated and itself excluded'
);
select is(
    (select unit_price from public.last_similar_awards('ocds-new', 1)),
    27.00::numeric,
    'unit price is the awarded amount over the quantity'
);
select is(
    (select number_of_tenderers from public.last_similar_awards('ocds-new', 1)),
    4,
    'says how many companies competed'
);
select is((select count(*) from public.awards)::int, 4, 'customers with a subscription read awards');
select is(
    (select count(*) from public.last_similar_awards('ocds-without-items'))::int,
    0,
    'a process without items has no similar awards'
);

-- With an expired subscription ---------------------------------------------
reset role;
select pg_temp.login_as('00000000-0000-0000-0000-0000000000d1');

select is((select count(*) from public.last_similar_awards('ocds-new'))::int, 0,
    'expired subscriptions get nothing');
select is((select count(*) from public.award_items)::int, 0, 'expired subscriptions read no award items');

reset role;

-- Customers can't write; anonymous visitors can't read -------------------------
select pg_temp.login_as('00000000-0000-0000-0000-0000000000c1');
select throws_ok(
    $$insert into public.awards (id, ocid) values ('x', 'ocds-new')$$,
    '42501', null, 'customers cannot write awards');
reset role;

set local role anon;
select throws_ok('select * from public.awards', '42501', null, 'anonymous visitors cannot read awards');
reset role;

select * from finish();
rollback;
