-- Accounts: organizations, plans, subscriptions, memberships, staff, demo leads.
-- Tenant isolation is enforced here with RLS (docs/ARCHITECTURE.md §5.5).

create table public.plans (
    code               text primary key,
    name               text not null,
    default_max_seats  int  not null check (default_max_seats > 0),
    max_alert_profiles int  check (max_alert_profiles > 0), -- null = unlimited
    features           jsonb not null default '{}'::jsonb,
    created_at         timestamptz not null default now()
);

insert into public.plans (code, name, default_max_seats, max_alert_profiles, features) values
    ('essential',    'Esencial',    1, 1,    '{"bid_tracking": false, "market": "limited"}'),
    ('professional', 'Profesional', 3, 5,    '{"bid_tracking": true,  "market": "full"}'),
    ('enterprise',   'Empresa',     10, null, '{"bid_tracking": true,  "market": "full_export"}');

create table public.organizations (
    id         uuid primary key default gen_random_uuid(),
    name       text not null check (char_length(name) between 2 and 200),
    ruc        text not null unique check (ruc ~ '^(10|15|16|17|20)[0-9]{9}$'),
    created_by uuid references auth.users (id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.subscriptions (
    organization_id uuid primary key references public.organizations (id) on delete cascade,
    plan_code       text not null references public.plans (code),
    status          text not null check (status in ('trial', 'active', 'paused', 'cancelled')),
    starts_at       timestamptz not null,
    ends_at         timestamptz not null,
    max_seats       int not null check (max_seats between 1 and 100),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    check (ends_at > starts_at)
);

create table public.memberships (
    organization_id uuid not null references public.organizations (id) on delete cascade,
    user_id         uuid not null references auth.users (id) on delete cascade,
    role            text not null check (role in ('owner', 'admin', 'member')),
    email           text not null check (email = lower(email)),
    invited_by      uuid references auth.users (id) on delete set null,
    invited_at      timestamptz not null default now(),
    joined_at       timestamptz, -- null while the invitation is pending
    primary key (organization_id, user_id)
);

-- MVP rule: one organization per person (EmailAlreadyRegisteredError in core).
create unique index memberships_one_organization_per_user on public.memberships (user_id);

create table public.platform_admins (
    user_id    uuid primary key references auth.users (id) on delete cascade,
    created_at timestamptz not null default now()
);

create table public.leads (
    id                  uuid primary key default gen_random_uuid(),
    full_name           text not null,
    company_name        text not null,
    ruc                 text,
    job_title           text,
    email               text not null,
    phone               text not null,
    sector              text not null,
    sells_to_government text not null check (sells_to_government in ('yes', 'no', 'not_sure')),
    source              text not null,
    status              text not null default 'new'
        check (status in ('new', 'contacted', 'demo_scheduled', 'won', 'lost')),
    created_at          timestamptz not null default now()
);

create index leads_created_at_idx on public.leads (created_at desc);

-- updated_at ----------------------------------------------------------------

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

create trigger organizations_set_updated_at before update on public.organizations
    for each row execute function public.set_updated_at();
create trigger subscriptions_set_updated_at before update on public.subscriptions
    for each row execute function public.set_updated_at();

-- Authorization helpers. SECURITY DEFINER so policies can read memberships
-- without recursing into memberships' own policies.

create function public.is_platform_admin() returns boolean
language sql stable security definer
set search_path = ''
as $$
    select exists (select 1 from public.platform_admins where user_id = (select auth.uid()));
$$;

create function public.is_org_member(org uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
    select exists (
        select 1 from public.memberships
        where organization_id = org and user_id = (select auth.uid())
    );
$$;

create function public.has_org_role(org uuid, roles text[]) returns boolean
language sql stable security definer
set search_path = ''
as $$
    select exists (
        select 1 from public.memberships
        where organization_id = org and user_id = (select auth.uid()) and role = any (roles)
    );
$$;

-- Mirrors subscriptionAccess() in packages/core.
create function public.has_active_subscription() returns boolean
language sql stable security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.memberships m
        join public.subscriptions s on s.organization_id = m.organization_id
        where m.user_id = (select auth.uid())
          and s.status in ('trial', 'active')
          and now() >= s.starts_at
          and now() < s.ends_at
    );
$$;

-- Use-case RPCs ------------------------------------------------------------

-- Organization + subscription in one transaction. SECURITY INVOKER: the insert
-- policies below decide who may call it (our staff only).
create function public.create_organization(
    p_name text,
    p_ruc text,
    p_plan_code text,
    p_status text,
    p_starts_at timestamptz,
    p_ends_at timestamptz,
    p_max_seats int
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
    v_organization_id uuid;
begin
    insert into public.organizations (name, ruc, created_by)
    values (p_name, p_ruc, (select auth.uid()))
    returning id into v_organization_id;

    insert into public.subscriptions (organization_id, plan_code, status, starts_at, ends_at, max_seats)
    values (v_organization_id, p_plan_code, p_status, p_starts_at, p_ends_at, p_max_seats);

    return v_organization_id;
end;
$$;

create function public.seat_usage(org uuid)
returns table (max_seats int, used int)
language sql stable
set search_path = ''
as $$
    select s.max_seats,
           (select count(*)::int from public.memberships m where m.organization_id = org)
    from public.subscriptions s
    where s.organization_id = org;
$$;

-- Called after an invited user sets their password.
create function public.accept_pending_memberships() returns void
language sql security definer
set search_path = ''
as $$
    update public.memberships
    set joined_at = now()
    where user_id = (select auth.uid()) and joined_at is null;
$$;

-- Function privileges: nothing callable by anonymous visitors.
revoke execute on function
    public.set_updated_at(),
    public.is_platform_admin(),
    public.is_org_member(uuid),
    public.has_org_role(uuid, text[]),
    public.has_active_subscription(),
    public.create_organization(text, text, text, text, timestamptz, timestamptz, int),
    public.seat_usage(uuid),
    public.accept_pending_memberships(),
    public.refresh_tender_matches(int)
from public, anon;

revoke execute on function public.refresh_tender_matches(int) from authenticated;

grant execute on function
    public.is_platform_admin(),
    public.is_org_member(uuid),
    public.has_org_role(uuid, text[]),
    public.has_active_subscription(),
    public.create_organization(text, text, text, text, timestamptz, timestamptz, int),
    public.seat_usage(uuid),
    public.accept_pending_memberships()
to authenticated;

-- Table privileges. Newer Supabase projects don't grant API roles access to new
-- tables automatically, so every grant is explicit. Privileges decide which
-- operations exist at all; RLS (below) decides which rows. anon gets nothing.

grant select on public.plans to authenticated;
grant select, insert, update on public.organizations, public.subscriptions to authenticated;
grant select, insert, delete on public.memberships to authenticated;
grant select on public.leads to authenticated;
grant select on
    public.tenders, public.documents, public.sync_runs, public.mype_profiles, public.tender_matches
to authenticated;

-- Server-side code with the secret key: backoffice auth admin, captcha-checked
-- leads, `pnpm admin:create`, and the jobs that will replace n8n.
grant select, insert, update, delete on
    public.plans, public.organizations, public.subscriptions, public.memberships,
    public.platform_admins, public.leads,
    public.tenders, public.documents, public.sync_runs, public.mype_profiles, public.tender_matches
to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Some projects (and local Supabase) grant anon everything by default. Revoke it so
-- anonymous visitors behave the same everywhere: no access, not merely zero rows.
revoke all on
    public.plans, public.organizations, public.subscriptions, public.memberships,
    public.platform_admins, public.leads,
    public.tenders, public.documents, public.sync_runs, public.mype_profiles, public.tender_matches
from anon;

-- RLS: accounts ------------------------------------------------------------

alter table public.plans enable row level security;
alter table public.organizations enable row level security;
alter table public.subscriptions enable row level security;
alter table public.memberships enable row level security;
alter table public.platform_admins enable row level security; -- no policies: API can't touch it
alter table public.leads enable row level security;

create policy plans_select on public.plans
    for select to authenticated using (true);

create policy organizations_select on public.organizations
    for select to authenticated
    using (public.is_org_member(id) or public.is_platform_admin());
create policy organizations_insert on public.organizations
    for insert to authenticated with check (public.is_platform_admin());
create policy organizations_update on public.organizations
    for update to authenticated
    using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy subscriptions_select on public.subscriptions
    for select to authenticated
    using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy subscriptions_insert on public.subscriptions
    for insert to authenticated with check (public.is_platform_admin());
create policy subscriptions_update on public.subscriptions
    for update to authenticated
    using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy memberships_select on public.memberships
    for select to authenticated
    using (public.is_org_member(organization_id) or public.is_platform_admin());
-- Mirrors canInviteWithRole() in packages/core.
create policy memberships_insert on public.memberships
    for insert to authenticated
    with check (
        public.is_platform_admin()
        or public.has_org_role(organization_id, array['owner'])
        or (public.has_org_role(organization_id, array['admin']) and role <> 'owner')
    );
create policy memberships_delete on public.memberships
    for delete to authenticated
    using (public.is_platform_admin() or public.has_org_role(organization_id, array['owner']));

-- Leads are written server-side after the captcha check (service role); only staff read them.
create policy leads_select on public.leads
    for select to authenticated using (public.is_platform_admin());

-- RLS: existing pipeline tables ---------------------------------------------
-- The n8n/legacy jobs connect as the table owner and are not affected by RLS.
-- Through the API, procurement data is the product: active subscribers only.

alter table public.tenders enable row level security;
alter table public.documents enable row level security;
alter table public.sync_runs enable row level security;
alter table public.mype_profiles enable row level security;
alter table public.tender_matches enable row level security;

create policy tenders_select on public.tenders
    for select to authenticated
    using (public.has_active_subscription() or public.is_platform_admin());
create policy documents_select on public.documents
    for select to authenticated
    using (public.has_active_subscription() or public.is_platform_admin());
create policy sync_runs_select on public.sync_runs
    for select to authenticated using (public.is_platform_admin());
create policy mype_profiles_select on public.mype_profiles
    for select to authenticated using (public.is_platform_admin());
create policy tender_matches_select on public.tender_matches
    for select to authenticated using (public.is_platform_admin());
