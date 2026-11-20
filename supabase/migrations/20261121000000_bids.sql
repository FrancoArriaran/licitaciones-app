-- Postulaciones (bids): what a company bids on, at what price, with which documents,
-- what happened (timeline) and the result. Private per organization.
-- Plus two public SEACE facts the bids need: who bid on each process and when offers close.

-- Public data from SEACE -----------------------------------------------------

alter table public.tenders add column tender_end timestamptz; -- deadline to submit offers

-- Every company that submitted an offer, from the OCDS `tender.tenderers`.
create table public.tender_participants (
    ocid       text not null references public.tenders (ocid) on delete cascade,
    party_id   text not null,
    ruc        text, -- null for consortia (SEACE gives them an internal id)
    name       text,
    updated_at timestamptz not null default now(),
    primary key (ocid, party_id)
);

create index tender_participants_ruc_idx on public.tender_participants (ruc);

-- Bids -------------------------------------------------------------------------

create table public.bids (
    id              uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    ocid            text not null references public.tenders (ocid),
    status          text not null default 'evaluating'
                    check (status in ('evaluating', 'preparing', 'submitted', 'won', 'lost', 'cancelled', 'withdrawn')),
    offered_amount  numeric check (offered_amount >= 0),
    awarded_amount  numeric check (awarded_amount >= 0),
    lost_reason     text check (lost_reason in ('price', 'requirements', 'disqualified', 'other')),
    assignee_id     uuid references auth.users (id) on delete set null,
    source          text not null default 'manual' check (source in ('manual', 'alert', 'seace_import')),
    created_by      uuid references auth.users (id) on delete set null,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique (organization_id, ocid),
    check (status = 'won' or awarded_amount is null),
    check (status = 'lost' or lost_reason is null)
);

create index bids_organization_status_idx on public.bids (organization_id, status, updated_at desc);

create trigger bids_set_updated_at before update on public.bids
    for each row execute function public.set_updated_at();

-- Immutable timeline: status changes, prices, notes, documents, detected results.
create table public.bid_events (
    id              bigint generated always as identity primary key,
    bid_id          uuid not null references public.bids (id) on delete cascade,
    organization_id uuid not null references public.organizations (id) on delete cascade,
    type            text not null
                    check (type in ('created', 'status_changed', 'offer_changed', 'result_recorded',
                                    'note', 'document_added', 'document_removed', 'assigned', 'result_detected')),
    data            jsonb not null default '{}',
    actor_id        uuid references auth.users (id) on delete set null,
    created_at      timestamptz not null default now()
);

create index bid_events_bid_idx on public.bid_events (bid_id, created_at desc);

-- Files live in Storage (bucket org-files); this is their metadata.
create table public.bid_documents (
    id              uuid primary key default gen_random_uuid(),
    bid_id          uuid not null references public.bids (id) on delete cascade,
    organization_id uuid not null references public.organizations (id) on delete cascade,
    storage_path    text not null unique,
    name            text not null check (length(name) between 1 and 200),
    size_bytes      bigint not null check (size_bytes > 0),
    content_type    text,
    uploaded_by     uuid references auth.users (id) on delete set null,
    created_at      timestamptz not null default now()
);

create index bid_documents_bid_idx on public.bid_documents (bid_id, created_at desc);

-- A child row must belong to the same organization as its bid.
create function public.bid_in_org(bid uuid, org uuid) returns boolean
language sql stable
set search_path = ''
as $$
    select exists (select 1 from public.bids b where b.id = bid and b.organization_id = org);
$$;

-- Privileges ---------------------------------------------------------------

revoke execute on function public.bid_in_org(uuid, uuid) from public, anon;
grant execute on function public.bid_in_org(uuid, uuid) to authenticated, service_role;

grant select on public.tender_participants to authenticated;
grant select, insert, update, delete on public.tender_participants to service_role;

grant select, insert, update, delete on public.bids to authenticated;
grant select, insert on public.bid_events to authenticated; -- no update or delete: immutable
grant select, insert, delete on public.bid_documents to authenticated;
grant select, insert, update, delete on public.bids, public.bid_events, public.bid_documents to service_role;

revoke all on public.tender_participants, public.bids, public.bid_events, public.bid_documents from anon;
-- Local Supabase grants everything by default: make immutability explicit everywhere.
revoke update, delete on public.bid_events from authenticated;
revoke update on public.bid_documents from authenticated;
revoke insert, update, delete on public.tender_participants from authenticated;

-- RLS ----------------------------------------------------------------------

alter table public.tender_participants enable row level security;
alter table public.bids enable row level security;
alter table public.bid_events enable row level security;
alter table public.bid_documents enable row level security;

create policy tender_participants_select on public.tender_participants
    for select to authenticated
    using (public.has_active_subscription() or public.is_platform_admin());

-- The whole team works on bids. Writing needs an active subscription (expired = read-only);
-- deleting a bid is for owners and admins.
create policy bids_select on public.bids
    for select to authenticated
    using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy bids_insert on public.bids
    for insert to authenticated
    with check (public.is_org_member(organization_id) and public.has_active_subscription());
create policy bids_update on public.bids
    for update to authenticated
    using (public.is_org_member(organization_id) and public.has_active_subscription())
    with check (public.is_org_member(organization_id));
create policy bids_delete on public.bids
    for delete to authenticated
    using (public.has_org_role(organization_id, array['owner', 'admin']) and public.has_active_subscription());

create policy bid_events_select on public.bid_events
    for select to authenticated
    using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy bid_events_insert on public.bid_events
    for insert to authenticated
    with check (
        public.is_org_member(organization_id)
        and public.has_active_subscription()
        and public.bid_in_org(bid_id, organization_id)
        and actor_id = (select auth.uid())
    );

create policy bid_documents_select on public.bid_documents
    for select to authenticated
    using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy bid_documents_insert on public.bid_documents
    for insert to authenticated
    with check (
        public.is_org_member(organization_id)
        and public.has_active_subscription()
        and public.bid_in_org(bid_id, organization_id)
        and storage_path like organization_id::text || '/bids/' || bid_id::text || '/%'
    );
create policy bid_documents_delete on public.bid_documents
    for delete to authenticated
    using (public.is_org_member(organization_id) and public.has_active_subscription());
