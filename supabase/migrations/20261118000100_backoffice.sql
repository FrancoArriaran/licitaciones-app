-- Backoffice and team management.

-- Staff move leads through the sales pipeline.
grant update on public.leads to authenticated;
create policy leads_update on public.leads
    for update to authenticated
    using (public.is_platform_admin()) with check (public.is_platform_admin());

-- Mirrors canManageMember() in packages/core: owners remove anyone, admins only members.
drop policy memberships_delete on public.memberships;
create policy memberships_delete on public.memberships
    for delete to authenticated
    using (
        public.is_platform_admin()
        or public.has_org_role(organization_id, array['owner'])
        or (public.has_org_role(organization_id, array['admin']) and role = 'member')
    );
