-- Private files of each organization (bid documents now; receivables later).
-- Path convention: {organization_id}/{module}/{record_id}/{file}. The first folder
-- decides who can see the file, so a member of one company can never read another's.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'org-files',
    'org-files',
    false,
    26214400, -- 25 MB
    array[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip',
        'application/x-zip-compressed',
        'application/vnd.rar',
        'application/x-rar-compressed',
        'image/jpeg',
        'image/png'
    ]
)
on conflict (id) do nothing;

-- Organization that owns a storage path, or null if the first folder isn't a uuid.
create function public.storage_path_org(path text) returns uuid
language sql immutable
set search_path = ''
as $$
    select case
        when split_part(path, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then split_part(path, '/', 1)::uuid
    end;
$$;

revoke execute on function public.storage_path_org(text) from public, anon;
grant execute on function public.storage_path_org(text) to authenticated, service_role;

create policy org_files_select on storage.objects
    for select to authenticated
    using (
        bucket_id = 'org-files'
        and (public.is_org_member(public.storage_path_org(name)) or public.is_platform_admin())
    );

create policy org_files_insert on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'org-files'
        and public.is_org_member(public.storage_path_org(name))
        and public.has_active_subscription()
    );

create policy org_files_delete on storage.objects
    for delete to authenticated
    using (
        bucket_id = 'org-files'
        and public.is_org_member(public.storage_path_org(name))
        and public.has_active_subscription()
    );
