begin;

-- Organization governance is owner-only. Operational administrators retain
-- full business-module access without gaining membership or tenant ownership controls.
drop policy if exists "organizations_update_admins" on public.organizations;
create policy "organizations_update_owner" on public.organizations
for update to authenticated
using (public.has_org_role(id, array['owner']::public.organization_role[]))
with check (public.has_org_role(id, array['owner']::public.organization_role[]));

drop policy if exists "memberships_insert_admins" on public.organization_memberships;
drop policy if exists "memberships_update_admins" on public.organization_memberships;
create policy "memberships_insert_owner" on public.organization_memberships
for insert to authenticated with check (
  public.has_org_role(organization_id, array['owner']::public.organization_role[])
);
create policy "memberships_update_owner" on public.organization_memberships
for update to authenticated
using (public.has_org_role(organization_id, array['owner']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['owner']::public.organization_role[]));

drop policy if exists "audit_select_governance_roles" on public.audit_events;
create policy "audit_select_governance_roles" on public.audit_events
for select to authenticated using (
  public.has_org_role(
    organization_id,
    array['owner','admin','procurement_manager','warehouse_manager','hr_manager']::public.organization_role[]
  )
);

-- Controlled organization documents are managed only by owner/admin roles.
drop policy if exists "documents_insert_members" on public.documents;
drop policy if exists "documents_update_owner_admin" on public.documents;
drop policy if exists "documents_delete_owner_admin" on public.documents;
create policy "documents_insert_owner_admin" on public.documents
for insert to authenticated with check (
  uploaded_by = auth.uid()
  and public.has_org_role(organization_id, array['owner','admin']::public.organization_role[])
);
create policy "documents_update_owner_admin" on public.documents
for update to authenticated
using (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]));
create policy "documents_delete_owner_admin" on public.documents
for delete to authenticated using (
  public.has_org_role(organization_id, array['owner','admin']::public.organization_role[])
);

drop policy if exists "documents_insert_members" on storage.objects;
create policy "documents_insert_owner_admin" on storage.objects
for insert to authenticated with check (
  bucket_id = 'organization-documents'
  and owner_id = auth.uid()::text
  and public.has_org_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner','admin']::public.organization_role[]
  )
);

-- Recruitment read access is shared by the recruitment team. Job definition
-- changes are reserved for owner/admin/HR manager; recruiters manage candidates,
-- the pipeline, and screening runs.
drop policy if exists "jobs_recruitment_access" on public.job_openings;
drop policy if exists "applicants_recruitment_access" on public.applicants;
drop policy if exists "applications_recruitment_access" on public.job_applications;
drop policy if exists "screening_runs_recruitment_access" on public.screening_runs;
drop policy if exists "screening_scores_recruitment_access" on public.screening_scores;

create policy "jobs_recruitment_select" on public.job_openings
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','hr_manager','recruiter']::public.organization_role[])
);
create policy "jobs_recruitment_insert" on public.job_openings
for insert to authenticated with check (
  public.has_org_role(organization_id, array['owner','admin','hr_manager']::public.organization_role[])
);
create policy "jobs_recruitment_update" on public.job_openings
for update to authenticated
using (public.has_org_role(organization_id, array['owner','admin','hr_manager']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','hr_manager']::public.organization_role[]));

create policy "applicants_recruitment_select" on public.applicants
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','hr_manager','recruiter']::public.organization_role[])
);
create policy "applicants_recruitment_insert" on public.applicants
for insert to authenticated with check (
  public.has_org_role(organization_id, array['owner','admin','hr_manager','recruiter']::public.organization_role[])
);
create policy "applicants_recruitment_update" on public.applicants
for update to authenticated
using (public.has_org_role(organization_id, array['owner','admin','hr_manager','recruiter']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','hr_manager','recruiter']::public.organization_role[]));

create policy "applications_recruitment_select" on public.job_applications
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','hr_manager','recruiter']::public.organization_role[])
);
create policy "applications_recruitment_insert" on public.job_applications
for insert to authenticated with check (
  public.has_org_role(organization_id, array['owner','admin','hr_manager','recruiter']::public.organization_role[])
);
create policy "applications_recruitment_update" on public.job_applications
for update to authenticated
using (public.has_org_role(organization_id, array['owner','admin','hr_manager','recruiter']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','hr_manager','recruiter']::public.organization_role[]));

create policy "screening_runs_recruitment_select" on public.screening_runs
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','hr_manager','recruiter']::public.organization_role[])
);
create policy "screening_runs_recruitment_insert" on public.screening_runs
for insert to authenticated with check (
  created_by = auth.uid()
  and public.has_org_role(organization_id, array['owner','admin','hr_manager','recruiter']::public.organization_role[])
);
create policy "screening_runs_recruitment_update" on public.screening_runs
for update to authenticated
using (
  created_by = auth.uid()
  and public.has_org_role(organization_id, array['owner','admin','hr_manager','recruiter']::public.organization_role[])
)
with check (
  created_by = auth.uid()
  and public.has_org_role(organization_id, array['owner','admin','hr_manager','recruiter']::public.organization_role[])
);

create policy "screening_scores_recruitment_select" on public.screening_scores
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','hr_manager','recruiter']::public.organization_role[])
);
create policy "screening_scores_recruitment_insert" on public.screening_scores
for insert to authenticated with check (
  public.has_org_role(organization_id, array['owner','admin','hr_manager','recruiter']::public.organization_role[])
  and exists (
    select 1 from public.screening_runs run
    where run.id = screening_scores.screening_run_id
      and run.organization_id = screening_scores.organization_id
      and run.created_by = auth.uid()
      and run.status = 'processing'
  )
);

-- Read scopes keep HR and recruitment-only accounts away from supply-chain data,
-- while Viewer remains a read-only operations role.
drop policy if exists "warehouses_select_members" on public.warehouses;
create policy "warehouses_select_business_roles" on public.warehouses
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','warehouse_manager','operator','viewer']::public.organization_role[])
);

drop policy if exists "products_select_members" on public.products;
create policy "products_select_business_roles" on public.products
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','warehouse_manager','operator','viewer']::public.organization_role[])
);

drop policy if exists "suppliers_select_members" on public.suppliers;
create policy "suppliers_select_procurement_roles" on public.suppliers
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','viewer']::public.organization_role[])
);

drop policy if exists "warehouse_locations_select_members" on public.warehouse_locations;
create policy "warehouse_locations_select_operations_roles" on public.warehouse_locations
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','warehouse_manager','operator','viewer']::public.organization_role[])
);

drop policy if exists "inventory_balances_select_members" on public.inventory_balances;
create policy "inventory_balances_select_operations_roles" on public.inventory_balances
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','warehouse_manager','operator','viewer']::public.organization_role[])
);

drop policy if exists "inventory_movements_select_members" on public.inventory_movements;
create policy "inventory_movements_select_operations_roles" on public.inventory_movements
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','warehouse_manager','operator','viewer']::public.organization_role[])
);

drop policy if exists "inventory_operations_select_members" on public.inventory_operations;
create policy "inventory_operations_select_operations_roles" on public.inventory_operations
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','warehouse_manager','operator','viewer']::public.organization_role[])
);

drop policy if exists "warehouse_tasks_select_members" on public.warehouse_tasks;
create policy "warehouse_tasks_select_operations_roles" on public.warehouse_tasks
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','warehouse_manager','operator','viewer']::public.organization_role[])
);

drop policy if exists "procurement_records_select_members" on public.procurement_records;
create policy "procurement_records_select_procurement_roles" on public.procurement_records
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','viewer']::public.organization_role[])
);

drop policy if exists "shipments_select_members" on public.shipments;
create policy "shipments_select_logistics_roles" on public.shipments
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','warehouse_manager','viewer']::public.organization_role[])
);

drop policy if exists "documents_select_members" on public.documents;
create policy "documents_select_business_roles" on public.documents
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','warehouse_manager','operator','viewer']::public.organization_role[])
);

drop policy if exists "documents_select_members" on storage.objects;
create policy "documents_select_business_roles" on storage.objects
for select to authenticated using (
  bucket_id = 'organization-documents'
  and public.has_org_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner','admin','procurement_manager','buyer','warehouse_manager','operator','viewer']::public.organization_role[]
  )
);

commit;
