begin;

alter table public.profiles
  add column if not exists email text;

update public.profiles profile
set email = lower(auth_user.email)
from auth.users auth_user
where profile.id = auth_user.id
  and auth_user.email is not null;

create unique index if not exists profiles_email_unique_idx
  on public.profiles (lower(email))
  where email is not null;

alter table public.organization_memberships
  add column if not exists invited_by uuid references auth.users(id) on delete set null,
  add column if not exists invited_at timestamptz,
  add column if not exists activated_at timestamptz;

update public.organization_memberships
set activated_at = created_at
where status = 'active' and activated_at is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    lower(new.email)
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(profiles.full_name, excluded.full_name),
      updated_at = now();
  return new;
end;
$$;

create or replace function public.sync_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set email = lower(new.email),
      full_name = coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
        full_name
      ),
      updated_at = now()
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update of email, raw_user_meta_data on auth.users
for each row execute function public.sync_user_profile();

create or replace function public.can_manage_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships manager
    join public.organization_memberships target
      on target.organization_id = manager.organization_id
    where manager.user_id = auth.uid()
      and manager.status = 'active'
      and manager.role in ('owner', 'admin')
      and target.user_id = target_user_id
  );
$$;

drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self_or_org_admin" on public.profiles
for select to authenticated
using (id = auth.uid() or public.can_manage_profile(id));

create or replace function public.activate_my_invited_memberships()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  activated record;
  activated_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  for activated in
    update public.organization_memberships
    set status = 'active', activated_at = now(), updated_at = now()
    where user_id = auth.uid() and status = 'invited'
    returning id, organization_id
  loop
    activated_count := activated_count + 1;
    insert into public.audit_events
      (organization_id, actor_id, action, entity_type, entity_id)
    values
      (activated.organization_id, auth.uid(), 'membership.activated', 'membership', activated.id);
  end loop;

  return activated_count;
end;
$$;

create or replace function public.admin_add_invited_membership(
  target_organization_id uuid,
  target_user_id uuid,
  target_role public.organization_role
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  membership_id uuid;
begin
  if not public.has_org_role(
    target_organization_id,
    array['owner']::public.organization_role[]
  ) then
    raise exception 'Owner permission required';
  end if;
  if target_role = 'owner' then
    raise exception 'Ownership must be transferred through a dedicated workflow';
  end if;
  if not exists (select 1 from auth.users where id = target_user_id) then
    raise exception 'Invited user does not exist';
  end if;
  if exists (
    select 1 from public.organization_memberships
    where organization_id = target_organization_id
      and user_id = target_user_id
      and role = 'owner'
  ) then
    raise exception 'Owner membership cannot be changed through an invitation';
  end if;

  insert into public.organization_memberships (
    organization_id, user_id, role, status,
    invited_by, invited_at, activated_at
  )
  values (
    target_organization_id, target_user_id, target_role, 'invited',
    auth.uid(), now(), null
  )
  on conflict (organization_id, user_id) do update
  set role = excluded.role,
      status = 'invited',
      invited_by = auth.uid(),
      invited_at = now(),
      activated_at = null,
      updated_at = now()
  returning id into membership_id;

  insert into public.audit_events
    (organization_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    target_organization_id,
    auth.uid(),
    'membership.invited',
    'membership',
    membership_id,
    jsonb_build_object('user_id', target_user_id, 'role', target_role)
  );

  return membership_id;
end;
$$;

create or replace function public.admin_update_membership(
  target_membership_id uuid,
  new_role public.organization_role,
  new_status public.membership_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_membership public.organization_memberships%rowtype;
begin
  select * into target_membership
  from public.organization_memberships
  where id = target_membership_id;

  if not found then
    raise exception 'Membership not found';
  end if;
  if not public.has_org_role(
    target_membership.organization_id,
    array['owner']::public.organization_role[]
  ) then
    raise exception 'Owner permission required';
  end if;
  if target_membership.role = 'owner' or new_role = 'owner' then
    raise exception 'Owner membership cannot be changed here';
  end if;

  update public.organization_memberships
  set role = new_role,
      status = new_status,
      activated_at = case
        when new_status = 'active' then coalesce(activated_at, now())
        else activated_at
      end,
      updated_at = now()
  where id = target_membership_id;

  insert into public.audit_events
    (organization_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    target_membership.organization_id,
    auth.uid(),
    'membership.updated',
    'membership',
    target_membership_id,
    jsonb_build_object(
      'previous_role', target_membership.role,
      'new_role', new_role,
      'previous_status', target_membership.status,
      'new_status', new_status
    )
  );
end;
$$;

create or replace function public.admin_update_organization(
  target_organization_id uuid,
  new_name text,
  new_slug text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_name text;
  previous_slug text;
begin
  if not public.has_org_role(
    target_organization_id,
    array['owner']::public.organization_role[]
  ) then
    raise exception 'Owner permission required';
  end if;
  if char_length(trim(new_name)) not between 2 and 100 then
    raise exception 'Organization name must be between 2 and 100 characters';
  end if;
  if new_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Organization slug is invalid';
  end if;

  select name, slug into previous_name, previous_slug
  from public.organizations
  where id = target_organization_id;

  update public.organizations
  set name = trim(new_name), slug = new_slug, updated_at = now()
  where id = target_organization_id;

  insert into public.audit_events
    (organization_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    target_organization_id,
    auth.uid(),
    'organization.updated',
    'organization',
    target_organization_id,
    jsonb_build_object(
      'previous_name', previous_name,
      'new_name', trim(new_name),
      'previous_slug', previous_slug,
      'new_slug', new_slug
    )
  );
end;
$$;

create or replace function public.admin_upsert_warehouse(
  target_organization_id uuid,
  target_warehouse_id uuid,
  warehouse_code text,
  warehouse_name text,
  warehouse_city text,
  warehouse_country_code text,
  warehouse_is_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_warehouse_id uuid;
  action_name text;
begin
  if not public.has_org_role(
    target_organization_id,
    array['owner']::public.organization_role[]
  ) then
    raise exception 'Owner permission required';
  end if;

  if target_warehouse_id is null then
    insert into public.warehouses (
      organization_id, code, name, city, country_code, is_active
    ) values (
      target_organization_id,
      upper(trim(warehouse_code)),
      trim(warehouse_name),
      nullif(trim(warehouse_city), ''),
      nullif(upper(trim(warehouse_country_code)), ''),
      warehouse_is_active
    ) returning id into saved_warehouse_id;
    action_name := 'warehouse.created';
  else
    update public.warehouses
    set code = upper(trim(warehouse_code)),
        name = trim(warehouse_name),
        city = nullif(trim(warehouse_city), ''),
        country_code = nullif(upper(trim(warehouse_country_code)), ''),
        is_active = warehouse_is_active,
        updated_at = now()
    where id = target_warehouse_id
      and organization_id = target_organization_id
    returning id into saved_warehouse_id;

    if saved_warehouse_id is null then
      raise exception 'Warehouse not found';
    end if;
    action_name := 'warehouse.updated';
  end if;

  insert into public.audit_events
    (organization_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    target_organization_id,
    auth.uid(),
    action_name,
    'warehouse',
    saved_warehouse_id,
    jsonb_build_object(
      'code', upper(trim(warehouse_code)),
      'name', trim(warehouse_name),
      'is_active', warehouse_is_active
    )
  );

  return saved_warehouse_id;
end;
$$;

create or replace function public.admin_set_warehouse_assignment(
  target_warehouse_id uuid,
  target_membership_id uuid,
  should_assign boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_organization_id uuid;
  membership_organization_id uuid;
  assignment_id uuid;
begin
  select organization_id into target_organization_id
  from public.warehouses where id = target_warehouse_id;
  select organization_id into membership_organization_id
  from public.organization_memberships where id = target_membership_id;

  if target_organization_id is null
    or membership_organization_id is null
    or target_organization_id <> membership_organization_id then
    raise exception 'Warehouse and membership must belong to the same organization';
  end if;
  if not public.has_org_role(
    target_organization_id,
    array['owner']::public.organization_role[]
  ) then
    raise exception 'Owner permission required';
  end if;

  if should_assign then
    insert into public.warehouse_assignments (
      organization_id, warehouse_id, membership_id
    ) values (
      target_organization_id, target_warehouse_id, target_membership_id
    ) on conflict (warehouse_id, membership_id) do nothing
    returning id into assignment_id;
  else
    delete from public.warehouse_assignments
    where warehouse_id = target_warehouse_id
      and membership_id = target_membership_id
    returning id into assignment_id;
  end if;

  insert into public.audit_events
    (organization_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    target_organization_id,
    auth.uid(),
    case when should_assign then 'warehouse.assignment_added'
         else 'warehouse.assignment_removed' end,
    'warehouse_assignment',
    assignment_id,
    jsonb_build_object(
      'warehouse_id', target_warehouse_id,
      'membership_id', target_membership_id
    )
  );
end;
$$;

revoke all on function public.sync_user_profile() from public;
revoke all on function public.can_manage_profile(uuid) from public;
revoke all on function public.activate_my_invited_memberships() from public;
revoke all on function public.admin_add_invited_membership(uuid, uuid, public.organization_role) from public;
revoke all on function public.admin_update_membership(uuid, public.organization_role, public.membership_status) from public;
revoke all on function public.admin_update_organization(uuid, text, text) from public;
revoke all on function public.admin_upsert_warehouse(uuid, uuid, text, text, text, text, boolean) from public;
revoke all on function public.admin_set_warehouse_assignment(uuid, uuid, boolean) from public;

grant execute on function public.can_manage_profile(uuid) to authenticated;
grant execute on function public.activate_my_invited_memberships() to authenticated;
grant execute on function public.admin_add_invited_membership(uuid, uuid, public.organization_role) to authenticated;
grant execute on function public.admin_update_membership(uuid, public.organization_role, public.membership_status) to authenticated;
grant execute on function public.admin_update_organization(uuid, text, text) to authenticated;
grant execute on function public.admin_upsert_warehouse(uuid, uuid, text, text, text, text, boolean) to authenticated;
grant execute on function public.admin_set_warehouse_assignment(uuid, uuid, boolean) to authenticated;

-- Route all governance mutations through the audited RPC functions above.
revoke update (name, slug, updated_at)
  on public.organizations from authenticated;
revoke insert (organization_id, user_id, role, status),
  update (role, status, updated_at)
  on public.organization_memberships from authenticated;
revoke insert (organization_id, code, name, city, country_code, is_active),
  update (code, name, city, country_code, is_active, updated_at)
  on public.warehouses from authenticated;
revoke insert (organization_id, warehouse_id, membership_id), delete
  on public.warehouse_assignments from authenticated;

commit;
