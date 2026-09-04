begin;

create extension if not exists pgcrypto;

create type public.organization_role as enum (
  'owner', 'admin', 'procurement_manager', 'buyer',
  'warehouse_manager', 'operator', 'viewer'
);
create type public.membership_status as enum ('invited', 'active', 'suspended');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text check (char_length(full_name) <= 80),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, created_by)
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null default 'viewer',
  status public.membership_status not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id),
  unique (organization_id, id)
);

create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9][A-Z0-9-]{1,19}$'),
  name text not null check (char_length(name) between 2 and 100),
  city text,
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (organization_id, id)
);

create table public.warehouse_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  warehouse_id uuid not null,
  membership_id uuid not null,
  created_at timestamptz not null default now(),
  unique (warehouse_id, membership_id),
  foreign key (organization_id, warehouse_id)
    references public.warehouses(organization_id, id) on delete cascade,
  foreign key (organization_id, membership_id)
    references public.organization_memberships(organization_id, id) on delete cascade
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(action) between 3 and 100),
  entity_type text not null check (char_length(entity_type) between 2 and 80),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index organization_memberships_user_idx
  on public.organization_memberships (user_id, status, organization_id);
create index warehouses_organization_idx
  on public.warehouses (organization_id, is_active);
create index warehouse_assignments_membership_idx
  on public.warehouse_assignments (membership_id, warehouse_id);
create index audit_events_organization_timeline_idx
  on public.audit_events (organization_id, occurred_at desc);
create index audit_events_entity_idx
  on public.audit_events (organization_id, entity_type, entity_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger organizations_set_updated_at before update on public.organizations
for each row execute function public.set_updated_at();
create trigger memberships_set_updated_at before update on public.organization_memberships
for each row execute function public.set_updated_at();
create trigger warehouses_set_updated_at before update on public.warehouses
for each row execute function public.set_updated_at();

create function public.protect_membership_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.organization_id <> old.organization_id or new.user_id <> old.user_id then
    raise exception 'Membership organization and user are immutable';
  end if;

  if old.role = 'owner' and old.status = 'active'
    and (new.role <> 'owner' or new.status <> 'active')
    and not exists (
      select 1 from public.organization_memberships membership
      where membership.organization_id = old.organization_id
        and membership.id <> old.id
        and membership.role = 'owner'
        and membership.status = 'active'
    )
  then
    raise exception 'An organization must retain at least one active owner';
  end if;

  return new;
end;
$$;

create trigger memberships_protect_identity
before update on public.organization_memberships
for each row execute function public.protect_membership_identity();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create function public.is_active_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  );
$$;

create function public.has_org_role(
  target_organization_id uuid,
  allowed_roles public.organization_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = any(allowed_roles)
  );
$$;

create function public.create_organization(organization_name text, organization_slug text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  created_organization_id uuid;
begin
  if actor_id is null then
    raise exception 'Authentication required';
  end if;
  if char_length(trim(organization_name)) not between 2 and 100 then
    raise exception 'Organization name must be between 2 and 100 characters';
  end if;
  if organization_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Organization slug is invalid';
  end if;

  insert into public.organizations (name, slug, created_by)
  values (trim(organization_name), organization_slug, actor_id)
  returning id into created_organization_id;

  insert into public.organization_memberships
    (organization_id, user_id, role, status)
  values
    (created_organization_id, actor_id, 'owner', 'active');

  insert into public.audit_events
    (organization_id, actor_id, action, entity_type, entity_id)
  values
    (created_organization_id, actor_id, 'organization.created', 'organization', created_organization_id);

  return created_organization_id;
end;
$$;

revoke all on function public.set_updated_at() from public;
revoke all on function public.handle_new_user() from public;
revoke all on function public.protect_membership_identity() from public;
revoke all on function public.is_active_member(uuid) from public;
revoke all on function public.has_org_role(uuid, public.organization_role[]) from public;
revoke all on function public.create_organization(text, text) from public;
grant execute on function public.is_active_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, public.organization_role[]) to authenticated;
grant execute on function public.create_organization(text, text) to authenticated;

grant select on public.profiles, public.organizations,
  public.organization_memberships, public.warehouses,
  public.warehouse_assignments, public.audit_events to authenticated;
grant update (full_name, avatar_url, updated_at) on public.profiles to authenticated;
grant update (name, slug, updated_at) on public.organizations to authenticated;
grant insert (organization_id, user_id, role, status),
  update (role, status, updated_at) on public.organization_memberships to authenticated;
grant insert (organization_id, code, name, city, country_code, is_active),
  update (code, name, city, country_code, is_active, updated_at) on public.warehouses to authenticated;
grant insert (organization_id, warehouse_id, membership_id),
  delete on public.warehouse_assignments to authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.warehouses enable row level security;
alter table public.warehouse_assignments enable row level security;
alter table public.audit_events enable row level security;

alter table public.profiles force row level security;
alter table public.organizations force row level security;
alter table public.organization_memberships force row level security;
alter table public.warehouses force row level security;
alter table public.warehouse_assignments force row level security;
alter table public.audit_events force row level security;

create policy "profiles_select_self" on public.profiles
for select to authenticated using (id = auth.uid());
create policy "profiles_update_self" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "organizations_select_members" on public.organizations
for select to authenticated using (public.is_active_member(id));
create policy "organizations_update_admins" on public.organizations
for update to authenticated
using (public.has_org_role(id, array['owner','admin']::public.organization_role[]))
with check (public.has_org_role(id, array['owner','admin']::public.organization_role[]));

create policy "memberships_select_members" on public.organization_memberships
for select to authenticated using (public.is_active_member(organization_id));
create policy "memberships_insert_admins" on public.organization_memberships
for insert to authenticated with check (
  public.has_org_role(organization_id, array['owner','admin']::public.organization_role[])
);
create policy "memberships_update_admins" on public.organization_memberships
for update to authenticated
using (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]));

create policy "warehouses_select_members" on public.warehouses
for select to authenticated using (public.is_active_member(organization_id));
create policy "warehouses_insert_admins" on public.warehouses
for insert to authenticated with check (
  public.has_org_role(organization_id, array['owner','admin','warehouse_manager']::public.organization_role[])
);
create policy "warehouses_update_admins" on public.warehouses
for update to authenticated
using (public.has_org_role(organization_id, array['owner','admin','warehouse_manager']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','warehouse_manager']::public.organization_role[]));

create policy "assignments_select_members" on public.warehouse_assignments
for select to authenticated using (public.is_active_member(organization_id));
create policy "assignments_insert_admins" on public.warehouse_assignments
for insert to authenticated with check (
  public.has_org_role(organization_id, array['owner','admin','warehouse_manager']::public.organization_role[])
);
create policy "assignments_delete_admins" on public.warehouse_assignments
for delete to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','warehouse_manager']::public.organization_role[])
);

create policy "audit_select_governance_roles" on public.audit_events
for select to authenticated using (
  public.has_org_role(
    organization_id,
    array['owner','admin','procurement_manager','warehouse_manager']::public.organization_role[]
  )
);

insert into storage.buckets (id, name, public, file_size_limit)
values ('organization-documents', 'organization-documents', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create policy "documents_select_members" on storage.objects
for select to authenticated using (
  bucket_id = 'organization-documents'
  and public.is_active_member(((storage.foldername(name))[1])::uuid)
);
create policy "documents_insert_members" on storage.objects
for insert to authenticated with check (
  bucket_id = 'organization-documents'
  and public.is_active_member(((storage.foldername(name))[1])::uuid)
  and owner_id = auth.uid()::text
);
create policy "documents_delete_admins" on storage.objects
for delete to authenticated using (
  bucket_id = 'organization-documents'
  and public.has_org_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner','admin']::public.organization_role[]
  )
);

commit;
