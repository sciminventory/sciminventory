begin;

create or replace function public.is_mfa_verified()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

-- Centralize MFA enforcement inside the role predicate used by operational,
-- recruitment, administration, and storage policies. Viewer remains read-only
-- and may access its permitted data at AAL1.
create or replace function public.has_org_role(
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
      and (
        membership.role = 'viewer'
        or public.is_mfa_verified()
      )
  );
$$;

revoke all on function public.is_mfa_verified() from public;
grant execute on function public.is_mfa_verified() to authenticated;
revoke all on function public.has_org_role(uuid, public.organization_role[]) from public;
grant execute on function public.has_org_role(uuid, public.organization_role[]) to authenticated;

-- Self-service profile changes do not call has_org_role, so protect them with
-- a restrictive update policy as well.
create policy "profiles_update_requires_mfa" on public.profiles
as restrictive for update to authenticated
using (public.is_mfa_verified())
with check (public.is_mfa_verified());

commit;
