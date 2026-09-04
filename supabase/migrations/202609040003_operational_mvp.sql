begin;

create type public.inventory_movement_type as enum (
  'receipt', 'issue', 'adjustment', 'transfer_in', 'transfer_out'
);
create type public.inventory_operation_type as enum ('transfer', 'cycle_count');
create type public.warehouse_task_type as enum ('receiving', 'putaway', 'picking');
create type public.procurement_record_type as enum (
  'requisition', 'rfq', 'quotation', 'purchase_order'
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sku text not null check (char_length(trim(sku)) between 2 and 40),
  name text not null check (char_length(trim(name)) between 2 and 160),
  category text,
  unit_of_measure text not null default 'EA' check (char_length(unit_of_measure) between 1 and 16),
  reorder_point numeric(18, 4) not null default 0 check (reorder_point >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sku),
  unique (organization_id, id)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null check (char_length(trim(code)) between 2 and 30),
  name text not null check (char_length(trim(name)) between 2 and 160),
  contact_email text,
  phone text,
  status text not null default 'active' check (status in ('active', 'on_hold', 'inactive')),
  lead_time_days integer check (lead_time_days is null or lead_time_days between 0 and 3650),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (organization_id, id)
);

create table public.warehouse_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  warehouse_id uuid not null,
  code text not null check (char_length(trim(code)) between 1 and 40),
  name text not null check (char_length(trim(name)) between 2 and 120),
  location_type text not null default 'storage'
    check (location_type in ('receiving', 'storage', 'picking', 'staging', 'quarantine')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, warehouse_id)
    references public.warehouses(organization_id, id) on delete cascade,
  unique (organization_id, warehouse_id, code),
  unique (organization_id, id)
);

create table public.inventory_balances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  warehouse_id uuid not null,
  product_id uuid not null,
  on_hand numeric(18, 4) not null default 0 check (on_hand >= 0),
  reserved numeric(18, 4) not null default 0 check (reserved >= 0 and reserved <= on_hand),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, warehouse_id)
    references public.warehouses(organization_id, id) on delete restrict,
  foreign key (organization_id, product_id)
    references public.products(organization_id, id) on delete restrict,
  unique (organization_id, warehouse_id, product_id)
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  warehouse_id uuid not null,
  product_id uuid not null,
  movement_type public.inventory_movement_type not null,
  quantity numeric(18, 4) not null check (quantity <> 0),
  reference text not null check (char_length(trim(reference)) between 2 and 60),
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  foreign key (organization_id, warehouse_id)
    references public.warehouses(organization_id, id) on delete restrict,
  foreign key (organization_id, product_id)
    references public.products(organization_id, id) on delete restrict
);

create table public.inventory_operations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  operation_type public.inventory_operation_type not null,
  reference text not null check (char_length(trim(reference)) between 2 and 60),
  title text not null check (char_length(trim(title)) between 2 and 160),
  source_warehouse_id uuid,
  destination_warehouse_id uuid,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'in_progress', 'completed', 'cancelled')),
  quantity numeric(18, 4) check (quantity is null or quantity >= 0),
  due_at timestamptz,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, source_warehouse_id)
    references public.warehouses(organization_id, id) on delete restrict,
  foreign key (organization_id, destination_warehouse_id)
    references public.warehouses(organization_id, id) on delete restrict,
  unique (organization_id, operation_type, reference)
);

create table public.warehouse_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  warehouse_id uuid not null,
  task_type public.warehouse_task_type not null,
  reference text not null check (char_length(trim(reference)) between 2 and 60),
  title text not null check (char_length(trim(title)) between 2 and 160),
  status text not null default 'open'
    check (status in ('open', 'assigned', 'in_progress', 'completed', 'cancelled')),
  quantity numeric(18, 4) check (quantity is null or quantity >= 0),
  due_at timestamptz,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, warehouse_id)
    references public.warehouses(organization_id, id) on delete restrict,
  unique (organization_id, task_type, reference)
);

create table public.procurement_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  record_type public.procurement_record_type not null,
  reference text not null check (char_length(trim(reference)) between 2 and 60),
  title text not null check (char_length(trim(title)) between 2 and 160),
  supplier_id uuid,
  warehouse_id uuid,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'approved', 'sent', 'received', 'completed', 'rejected', 'cancelled')),
  amount numeric(18, 2) check (amount is null or amount >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  due_at timestamptz,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, supplier_id)
    references public.suppliers(organization_id, id) on delete restrict,
  foreign key (organization_id, warehouse_id)
    references public.warehouses(organization_id, id) on delete restrict,
  unique (organization_id, record_type, reference)
);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reference text not null check (char_length(trim(reference)) between 2 and 60),
  title text not null check (char_length(trim(title)) between 2 and 160),
  carrier text,
  tracking_number text,
  warehouse_id uuid,
  status text not null default 'planned'
    check (status in ('planned', 'booked', 'in_transit', 'delivered', 'exception', 'cancelled')),
  due_at timestamptz,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, warehouse_id)
    references public.warehouses(organization_id, id) on delete restrict,
  unique (organization_id, reference)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reference text not null check (char_length(trim(reference)) between 2 and 60),
  title text not null check (char_length(trim(title)) between 2 and 160),
  document_type text not null default 'general',
  storage_path text,
  file_name text,
  mime_type text,
  file_size bigint check (file_size is null or file_size >= 0),
  status text not null default 'active' check (status in ('active', 'verified', 'expired', 'archived')),
  notes text,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, reference)
);

create index products_organization_idx on public.products (organization_id, is_active, name);
create index suppliers_organization_idx on public.suppliers (organization_id, status, name);
create index locations_warehouse_idx on public.warehouse_locations (organization_id, warehouse_id, is_active);
create index balances_product_idx on public.inventory_balances (organization_id, product_id, warehouse_id);
create index movements_timeline_idx on public.inventory_movements (organization_id, occurred_at desc);
create index inventory_operations_idx on public.inventory_operations (organization_id, operation_type, status, created_at desc);
create index warehouse_tasks_idx on public.warehouse_tasks (organization_id, task_type, status, created_at desc);
create index procurement_records_idx on public.procurement_records (organization_id, record_type, status, created_at desc);
create index shipments_timeline_idx on public.shipments (organization_id, status, created_at desc);
create index documents_timeline_idx on public.documents (organization_id, status, created_at desc);

create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();
create trigger suppliers_set_updated_at before update on public.suppliers
for each row execute function public.set_updated_at();
create trigger locations_set_updated_at before update on public.warehouse_locations
for each row execute function public.set_updated_at();
create trigger balances_set_updated_at before update on public.inventory_balances
for each row execute function public.set_updated_at();
create trigger inventory_operations_set_updated_at before update on public.inventory_operations
for each row execute function public.set_updated_at();
create trigger warehouse_tasks_set_updated_at before update on public.warehouse_tasks
for each row execute function public.set_updated_at();
create trigger procurement_records_set_updated_at before update on public.procurement_records
for each row execute function public.set_updated_at();
create trigger shipments_set_updated_at before update on public.shipments
for each row execute function public.set_updated_at();
create trigger documents_set_updated_at before update on public.documents
for each row execute function public.set_updated_at();

create function public.audit_operational_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  target_organization_id uuid := (row_data ->> 'organization_id')::uuid;
  target_entity_id uuid := (row_data ->> 'id')::uuid;
begin
  insert into public.audit_events
    (organization_id, actor_id, action, entity_type, entity_id, metadata)
  values
    (target_organization_id, auth.uid(), lower(tg_table_name) || '.' || lower(tg_op),
     tg_table_name, target_entity_id, jsonb_build_object('operation', tg_op));
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'products', 'suppliers', 'warehouse_locations', 'inventory_movements',
    'inventory_operations', 'warehouse_tasks', 'procurement_records',
    'shipments', 'documents'
  ] loop
    execute format(
      'create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.audit_operational_change()',
      table_name, table_name
    );
  end loop;
end;
$$;

create function public.post_inventory_movement(
  target_organization_id uuid,
  target_warehouse_id uuid,
  target_product_id uuid,
  target_movement_type public.inventory_movement_type,
  target_quantity numeric,
  target_reference text,
  target_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  movement_id uuid;
  quantity_delta numeric(18, 4);
  current_on_hand numeric(18, 4);
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if not public.has_org_role(
    target_organization_id,
    array['owner','admin','warehouse_manager','operator']::public.organization_role[]
  ) then raise exception 'Insufficient inventory permission'; end if;
  if target_quantity = 0 then raise exception 'Quantity must not be zero'; end if;
  if char_length(trim(target_reference)) not between 2 and 60 then
    raise exception 'Reference must be between 2 and 60 characters';
  end if;
  if not exists (
    select 1 from public.warehouses warehouse
    where warehouse.organization_id = target_organization_id
      and warehouse.id = target_warehouse_id and warehouse.is_active
  ) then raise exception 'Warehouse is not active'; end if;
  if not exists (
    select 1 from public.products product
    where product.organization_id = target_organization_id
      and product.id = target_product_id and product.is_active
  ) then raise exception 'Product is not active'; end if;

  quantity_delta := case
    when target_movement_type in ('receipt', 'transfer_in') then abs(target_quantity)
    when target_movement_type in ('issue', 'transfer_out') then -abs(target_quantity)
    else target_quantity
  end;

  perform pg_advisory_xact_lock(
    hashtextextended(target_organization_id::text || target_warehouse_id::text || target_product_id::text, 0)
  );
  select balance.on_hand into current_on_hand
  from public.inventory_balances balance
  where balance.organization_id = target_organization_id
    and balance.warehouse_id = target_warehouse_id
    and balance.product_id = target_product_id;
  current_on_hand := coalesce(current_on_hand, 0);
  if current_on_hand + quantity_delta < 0 then
    raise exception 'Movement would make on-hand stock negative';
  end if;

  insert into public.inventory_balances
    (organization_id, warehouse_id, product_id, on_hand)
  values
    (target_organization_id, target_warehouse_id, target_product_id, quantity_delta)
  on conflict (organization_id, warehouse_id, product_id)
  do update set on_hand = public.inventory_balances.on_hand + excluded.on_hand;

  insert into public.inventory_movements
    (organization_id, warehouse_id, product_id, movement_type, quantity, reference, notes, created_by)
  values
    (target_organization_id, target_warehouse_id, target_product_id,
     target_movement_type, quantity_delta, trim(target_reference), nullif(trim(target_notes), ''), actor_id)
  returning id into movement_id;
  return movement_id;
end;
$$;

revoke all on function public.audit_operational_change() from public;
revoke all on function public.post_inventory_movement(uuid, uuid, uuid, public.inventory_movement_type, numeric, text, text) from public;
grant execute on function public.post_inventory_movement(uuid, uuid, uuid, public.inventory_movement_type, numeric, text, text) to authenticated;

alter table public.products enable row level security;
alter table public.suppliers enable row level security;
alter table public.warehouse_locations enable row level security;
alter table public.inventory_balances enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.inventory_operations enable row level security;
alter table public.warehouse_tasks enable row level security;
alter table public.procurement_records enable row level security;
alter table public.shipments enable row level security;
alter table public.documents enable row level security;

alter table public.products force row level security;
alter table public.suppliers force row level security;
alter table public.warehouse_locations force row level security;
alter table public.inventory_balances force row level security;
alter table public.inventory_movements force row level security;
alter table public.inventory_operations force row level security;
alter table public.warehouse_tasks force row level security;
alter table public.procurement_records force row level security;
alter table public.shipments force row level security;
alter table public.documents force row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'products', 'suppliers', 'warehouse_locations', 'inventory_balances',
    'inventory_movements', 'inventory_operations', 'warehouse_tasks',
    'procurement_records', 'shipments', 'documents'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_active_member(organization_id))',
      table_name || '_select_members', table_name
    );
  end loop;
end;
$$;

create policy "products_manage_authorized" on public.products
for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','warehouse_manager']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','warehouse_manager']::public.organization_role[]));
create policy "suppliers_manage_procurement" on public.suppliers
for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer']::public.organization_role[]));
create policy "locations_manage_warehouse" on public.warehouse_locations
for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin','warehouse_manager']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','warehouse_manager']::public.organization_role[]));
create policy "inventory_operations_manage_warehouse" on public.inventory_operations
for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin','warehouse_manager','operator']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','warehouse_manager','operator']::public.organization_role[]));
create policy "warehouse_tasks_manage_warehouse" on public.warehouse_tasks
for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin','warehouse_manager','operator']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','warehouse_manager','operator']::public.organization_role[]));
create policy "procurement_records_manage_procurement" on public.procurement_records
for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer']::public.organization_role[]));
create policy "shipments_manage_operations" on public.shipments
for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','warehouse_manager']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','warehouse_manager']::public.organization_role[]));
create policy "documents_insert_members" on public.documents
for insert to authenticated with check (public.is_active_member(organization_id) and uploaded_by = auth.uid());
create policy "documents_update_owner_admin" on public.documents
for update to authenticated
using (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]));
create policy "documents_delete_owner_admin" on public.documents
for delete to authenticated
using (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]));

grant select, insert, update, delete on public.products, public.suppliers,
  public.warehouse_locations, public.inventory_operations, public.warehouse_tasks,
  public.procurement_records, public.shipments, public.documents to authenticated;
grant select on public.inventory_balances, public.inventory_movements to authenticated;

commit;
