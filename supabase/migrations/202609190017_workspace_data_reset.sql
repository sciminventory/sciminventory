begin;

create or replace function public.reset_organization_data(
  target_organization_id uuid,
  confirmed_organization_name text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  reset_actor_id uuid := auth.uid();
  organization_name text;
  reset_started_at timestamptz := clock_timestamp();
  target_table text;
  affected_rows integer;
  deleted_rows integer := 0;
begin
  if reset_actor_id is null then
    raise exception 'Authentication required';
  end if;
  if coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' then
    raise exception 'Multi-factor authentication is required';
  end if;
  if not public.has_org_role(
    target_organization_id,
    array['owner']::public.organization_role[]
  ) then
    raise exception 'Owner permission required';
  end if;

  select name into organization_name
  from public.organizations
  where id = target_organization_id;

  if organization_name is null then
    raise exception 'Organization not found';
  end if;
  if confirmed_organization_name is null
    or confirmed_organization_name <> organization_name then
    raise exception 'Organization name confirmation does not match';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('workspace-reset:' || target_organization_id::text, 0)
  );

  foreach target_table in array array[
    'vendor_messages',
    'vendor_conversations',
    'notifications',
    'payment_records',
    'invoice_matches',
    'vendor_invoice_lines',
    'vendor_return_requests',
    'goods_receipt_lines',
    'goods_receipts',
    'shipment_events',
    'shipment_lines',
    'vendor_invoices',
    'purchase_order_acknowledgements',
    'procurement_record_links',
    'procurement_record_lines',
    'shipments',
    'workflow_events',
    'vendor_reviews',
    'vendor_improvement_plans',
    'vendor_documents',
    'vendor_shipping_rules',
    'vendor_catalog_items',
    'vendor_addresses',
    'vendor_contacts',
    'vendor_users',
    'demand_forecasts',
    'screening_scores',
    'screening_runs',
    'job_applications',
    'applicants',
    'job_openings',
    'inventory_movements',
    'inventory_balances',
    'inventory_operations',
    'warehouse_tasks',
    'warehouse_locations',
    'documents',
    'procurement_records',
    'vendor_performance_snapshots',
    'suppliers',
    'products',
    'warehouse_assignments',
    'warehouses'
  ] loop
    execute format(
      'delete from public.%I where organization_id = $1',
      target_table
    ) using target_organization_id;
    get diagnostics affected_rows = row_count;
    deleted_rows := deleted_rows + affected_rows;
  end loop;

  -- Collapse trigger-generated deletion entries into one governance event,
  -- while retaining the audit history that existed before this reset.
  delete from public.audit_events audit
  where audit.organization_id = target_organization_id
    and audit.actor_id = reset_actor_id
    and audit.occurred_at >= reset_started_at
    and audit.action like '%.delete';

  insert into public.audit_events
    (organization_id, actor_id, action, entity_type, entity_id, metadata)
  values
    (target_organization_id, reset_actor_id, 'organization.data_reset',
     'organization', target_organization_id,
     jsonb_build_object(
       'deleted_records', deleted_rows,
       'organization_name', organization_name,
       'reset_at', now()
     ));

  return deleted_rows;
end;
$$;

revoke all on function public.reset_organization_data(uuid, text) from public;
grant execute on function public.reset_organization_data(uuid, text) to authenticated;

commit;
