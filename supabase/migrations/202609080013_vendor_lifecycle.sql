begin;

alter table public.suppliers
  add column legal_name text,
  add column tax_id text,
  add column registration_number text,
  add column vendor_category text not null default 'raw_material'
    check (vendor_category in ('raw_material','finished_goods','spare_parts','logistics_provider','services')),
  add column onboarding_status text not null default 'draft'
    check (onboarding_status in ('draft','submitted','under_review','changes_requested','approved','rejected','suspended','archived')),
  add column payment_terms_days integer not null default 30 check (payment_terms_days between 0 and 365),
  add column credit_limit numeric(18,2) not null default 0 check (credit_limit >= 0),
  add column currency text not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  add column delivery_capacity numeric(18,4) check (delivery_capacity is null or delivery_capacity >= 0),
  add column delivery_methods text[] not null default '{}',
  add column service_areas text[] not null default '{}',
  add column cutoff_time time,
  add column website text,
  add column address_line text,
  add column city text,
  add column province text,
  add column postal_code text,
  add column country_code text not null default 'PH' check (country_code ~ '^[A-Z]{2}$'),
  add column approved_at timestamptz,
  add column approved_by uuid references auth.users(id) on delete set null,
  add column risk_rating text not null default 'unrated' check (risk_rating in ('unrated','low','medium','high')),
  add column notes text;

update public.suppliers
set legal_name = name,
    onboarding_status = case when status = 'active' then 'approved' else 'draft' end,
    approved_at = case when status = 'active' then created_at else null end
where legal_name is null;

alter table public.procurement_records
  add constraint procurement_records_org_id_unique unique (organization_id, id),
  add column shipping_address text,
  add column delivery_date date,
  add column terms_and_conditions text,
  add column version integer not null default 1 check (version > 0);

alter table public.procurement_records drop constraint if exists procurement_records_status_check;
alter table public.procurement_records add constraint procurement_records_status_check check (
  status in ('draft','pending','submitted','approved','sent','confirmed','revised','processing','packing',
             'ready_for_shipment','in_transit','partially_received','received','completed','closed',
             'overdue','rejected','cancelled')
);

alter table public.shipments
  add constraint shipments_org_id_unique unique (organization_id, id),
  add column supplier_id uuid,
  add column purchase_order_id uuid,
  add column vehicle_details text,
  add column dispatched_at timestamptz,
  add column expected_arrival_at timestamptz,
  add column actual_arrival_at timestamptz,
  add foreign key (organization_id, supplier_id)
    references public.suppliers(organization_id, id) on delete restrict,
  add foreign key (organization_id, purchase_order_id)
    references public.procurement_records(organization_id, id) on delete restrict;

alter table public.shipments drop constraint if exists shipments_status_check;
alter table public.shipments add constraint shipments_status_check check (
  status in ('planned','processing','packing','ready_for_shipment','booked','dispatched','in_transit','arrived','delivered','exception','cancelled')
);

create table public.vendor_users (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','member','finance','logistics')),
  status public.membership_status not null default 'invited',
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz not null default now(),
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, supplier_id)
    references public.suppliers(organization_id, id) on delete cascade,
  unique (organization_id, supplier_id, user_id),
  unique (organization_id, id)
);

create table public.vendor_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null,
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  email text not null,
  phone text,
  job_title text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, supplier_id)
    references public.suppliers(organization_id, id) on delete cascade
);

create table public.vendor_addresses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null,
  address_type text not null default 'office' check (address_type in ('office','warehouse','billing','returns')),
  label text not null,
  address_line text not null,
  city text not null,
  province text,
  postal_code text,
  country_code text not null default 'PH' check (country_code ~ '^[A-Z]{2}$'),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, supplier_id)
    references public.suppliers(organization_id, id) on delete cascade
);

create table public.vendor_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null,
  document_type text not null,
  title text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null check (file_size between 1 and 26214400),
  status text not null default 'submitted' check (status in ('submitted','verified','rejected','expired','archived')),
  expires_at date,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, supplier_id)
    references public.suppliers(organization_id, id) on delete cascade
);

create table public.vendor_catalog_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null,
  product_id uuid,
  vendor_item_code text not null,
  description text not null,
  unit_price numeric(18,4) not null check (unit_price >= 0),
  currency text not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  minimum_order_quantity numeric(18,4) not null default 1 check (minimum_order_quantity > 0),
  lead_time_days integer not null default 0 check (lead_time_days between 0 and 3650),
  delivery_window_days integer not null default 0 check (delivery_window_days between 0 and 365),
  packaging_specs text,
  status text not null default 'active' check (status in ('draft','active','inactive')),
  valid_from date,
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, supplier_id)
    references public.suppliers(organization_id, id) on delete cascade,
  foreign key (organization_id, product_id)
    references public.products(organization_id, id) on delete restrict,
  unique (organization_id, supplier_id, vendor_item_code),
  unique (organization_id, id)
);

create table public.vendor_shipping_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null,
  shipping_method text not null,
  service_area text not null,
  cutoff_time time,
  delay_penalty_rate numeric(8,4) not null default 0 check (delay_penalty_rate between 0 and 100),
  instructions text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, supplier_id)
    references public.suppliers(organization_id, id) on delete cascade
);

create table public.procurement_record_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  procurement_record_id uuid not null,
  product_id uuid,
  vendor_catalog_item_id uuid,
  line_number integer not null check (line_number > 0),
  description text not null,
  quantity numeric(18,4) not null check (quantity > 0),
  unit_price numeric(18,4) not null default 0 check (unit_price >= 0),
  tax_rate numeric(8,4) not null default 0 check (tax_rate between 0 and 100),
  promised_date date,
  received_quantity numeric(18,4) not null default 0 check (received_quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, procurement_record_id)
    references public.procurement_records(organization_id, id) on delete cascade,
  foreign key (organization_id, product_id)
    references public.products(organization_id, id) on delete restrict,
  foreign key (organization_id, vendor_catalog_item_id)
    references public.vendor_catalog_items(organization_id, id) on delete set null,
  unique (procurement_record_id, line_number),
  unique (organization_id, id)
);

create table public.demand_forecasts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null,
  warehouse_id uuid not null,
  forecast_date date not null,
  forecast_quantity numeric(18,4) not null check (forecast_quantity >= 0),
  confidence numeric(6,2) check (confidence is null or confidence between 0 and 100),
  source text not null default 'manual' check (source in ('manual','historical','integration')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, product_id)
    references public.products(organization_id, id) on delete cascade,
  foreign key (organization_id, warehouse_id)
    references public.warehouses(organization_id, id) on delete cascade,
  unique (organization_id, product_id, warehouse_id, forecast_date)
);

create table public.procurement_record_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_record_id uuid not null,
  target_record_id uuid not null,
  relation_type text not null check (relation_type in ('converted_to','quoted_for','ordered_from','revises')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (organization_id, source_record_id)
    references public.procurement_records(organization_id, id) on delete cascade,
  foreign key (organization_id, target_record_id)
    references public.procurement_records(organization_id, id) on delete cascade,
  unique (source_record_id, target_record_id, relation_type)
);

create table public.purchase_order_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  purchase_order_id uuid not null,
  supplier_id uuid not null,
  response text not null check (response in ('confirmed','revised','rejected')),
  proposed_amount numeric(18,2) check (proposed_amount is null or proposed_amount >= 0),
  proposed_delivery_date date,
  message text,
  responded_by uuid not null references auth.users(id) on delete restrict,
  responded_at timestamptz not null default now(),
  foreign key (organization_id, purchase_order_id)
    references public.procurement_records(organization_id, id) on delete cascade,
  foreign key (organization_id, supplier_id)
    references public.suppliers(organization_id, id) on delete cascade
);

create table public.workflow_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid,
  entity_type text not null,
  entity_id uuid not null,
  from_status text,
  to_status text not null,
  message text,
  actor_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  foreign key (organization_id, supplier_id)
    references public.suppliers(organization_id, id) on delete cascade
);

create table public.shipment_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  shipment_id uuid not null,
  purchase_order_line_id uuid,
  product_id uuid,
  description text not null,
  quantity numeric(18,4) not null check (quantity > 0),
  received_quantity numeric(18,4) not null default 0 check (received_quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, shipment_id)
    references public.shipments(organization_id, id) on delete cascade,
  foreign key (organization_id, product_id)
    references public.products(organization_id, id) on delete restrict,
  foreign key (organization_id, purchase_order_line_id)
    references public.procurement_record_lines(organization_id, id) on delete set null,
  unique (organization_id, id)
);

create table public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  shipment_id uuid not null,
  status text not null,
  location text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  message text,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  foreign key (organization_id, shipment_id)
    references public.shipments(organization_id, id) on delete cascade
);

create table public.goods_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  shipment_id uuid not null,
  purchase_order_id uuid,
  warehouse_id uuid not null,
  reference text not null,
  status text not null default 'draft' check (status in ('draft','inspecting','partial','accepted','rejected','completed')),
  received_by uuid not null references auth.users(id) on delete restrict,
  received_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, shipment_id)
    references public.shipments(organization_id, id) on delete restrict,
  foreign key (organization_id, purchase_order_id)
    references public.procurement_records(organization_id, id) on delete restrict,
  foreign key (organization_id, warehouse_id)
    references public.warehouses(organization_id, id) on delete restrict,
  unique (organization_id, reference),
  unique (organization_id, id)
);

create table public.goods_receipt_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  goods_receipt_id uuid not null,
  shipment_line_id uuid not null,
  product_id uuid,
  expected_quantity numeric(18,4) not null check (expected_quantity >= 0),
  accepted_quantity numeric(18,4) not null default 0 check (accepted_quantity >= 0),
  rejected_quantity numeric(18,4) not null default 0 check (rejected_quantity >= 0),
  rejection_reason text,
  quality_ok boolean not null default true,
  condition_ok boolean not null default true,
  packaging_ok boolean not null default true,
  created_at timestamptz not null default now(),
  foreign key (organization_id, goods_receipt_id)
    references public.goods_receipts(organization_id, id) on delete cascade,
  foreign key (organization_id, product_id)
    references public.products(organization_id, id) on delete restrict,
  foreign key (organization_id, shipment_line_id)
    references public.shipment_lines(organization_id, id) on delete restrict,
  unique (organization_id, id)
);

create table public.vendor_return_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null,
  goods_receipt_line_id uuid not null,
  reference text not null,
  reason text not null,
  quantity numeric(18,4) not null check (quantity > 0),
  resolution text check (resolution is null or resolution in ('replacement','credit','refund','rejected')),
  status text not null default 'open' check (status in ('open','accepted','in_transit','resolved','rejected')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, supplier_id)
    references public.suppliers(organization_id, id) on delete restrict,
  foreign key (organization_id, goods_receipt_line_id)
    references public.goods_receipt_lines(organization_id, id) on delete restrict,
  unique (organization_id, reference)
);

create table public.vendor_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null,
  purchase_order_id uuid not null,
  invoice_number text not null,
  invoice_date date not null,
  due_date date not null,
  subtotal numeric(18,2) not null check (subtotal >= 0),
  tax_amount numeric(18,2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(18,2) not null check (total_amount >= 0),
  currency text not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'submitted' check (status in ('draft','submitted','matching','exception','approved','scheduled','paid','overdue','rejected','cancelled')),
  storage_path text,
  mismatch_reason text,
  submitted_by uuid not null references auth.users(id) on delete restrict,
  submitted_at timestamptz not null default now(),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, supplier_id)
    references public.suppliers(organization_id, id) on delete restrict,
  foreign key (organization_id, purchase_order_id)
    references public.procurement_records(organization_id, id) on delete restrict,
  unique (organization_id, supplier_id, invoice_number),
  unique (organization_id, id)
);

create table public.vendor_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null,
  purchase_order_line_id uuid,
  description text not null,
  quantity numeric(18,4) not null check (quantity > 0),
  unit_price numeric(18,4) not null check (unit_price >= 0),
  tax_rate numeric(8,4) not null default 0 check (tax_rate between 0 and 100),
  created_at timestamptz not null default now(),
  foreign key (organization_id, invoice_id)
    references public.vendor_invoices(organization_id, id) on delete cascade,
  foreign key (organization_id, purchase_order_line_id)
    references public.procurement_record_lines(organization_id, id) on delete restrict
);

create table public.invoice_matches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null,
  purchase_order_amount numeric(18,2) not null,
  received_amount numeric(18,2) not null,
  invoice_amount numeric(18,2) not null,
  price_variance numeric(18,2) not null default 0,
  quantity_variance numeric(18,4) not null default 0,
  result text not null check (result in ('matched','exception')),
  details jsonb not null default '{}',
  matched_by uuid not null references auth.users(id) on delete restrict,
  matched_at timestamptz not null default now(),
  foreign key (organization_id, invoice_id)
    references public.vendor_invoices(organization_id, id) on delete cascade
);

create table public.payment_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null,
  invoice_id uuid not null,
  reference text not null,
  amount numeric(18,2) not null check (amount > 0),
  currency text not null default 'PHP',
  payment_method text,
  status text not null default 'pending' check (status in ('pending','approved','scheduled','paid','failed','cancelled')),
  scheduled_at timestamptz,
  paid_at timestamptz,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, supplier_id)
    references public.suppliers(organization_id, id) on delete restrict,
  foreign key (organization_id, invoice_id)
    references public.vendor_invoices(organization_id, id) on delete restrict,
  unique (organization_id, reference)
);

create table public.vendor_performance_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null,
  period_start date not null,
  period_end date not null,
  on_time_delivery_rate numeric(6,2) not null default 0,
  fulfillment_rate numeric(6,2) not null default 0,
  quality_score numeric(6,2) not null default 0,
  accuracy_score numeric(6,2) not null default 0,
  response_time_hours numeric(10,2) not null default 0,
  overall_score numeric(6,2) not null default 0,
  order_count integer not null default 0,
  calculated_at timestamptz not null default now(),
  calculated_by uuid references auth.users(id) on delete set null,
  foreign key (organization_id, supplier_id)
    references public.suppliers(organization_id, id) on delete cascade,
  unique (organization_id, supplier_id, period_start, period_end)
);

create table public.vendor_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null,
  action text not null check (action in ('preferred','renew','coaching','warning','improvement_plan','suspend','deactivate')),
  summary text not null,
  review_date date not null default current_date,
  next_review_date date,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (organization_id, supplier_id)
    references public.suppliers(organization_id, id) on delete cascade
);

create table public.vendor_improvement_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null,
  title text not null,
  objectives text not null,
  due_date date not null,
  status text not null default 'open' check (status in ('open','in_progress','completed','failed','cancelled')),
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, supplier_id)
    references public.suppliers(organization_id, id) on delete cascade
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid,
  user_id uuid references auth.users(id) on delete cascade,
  audience text not null check (audience in ('internal','vendor')),
  title text not null,
  message text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (organization_id, supplier_id)
    references public.suppliers(organization_id, id) on delete cascade
);

create table public.public_vendor_application_attempts (
  id uuid primary key default gen_random_uuid(),
  identifier_hash text not null check (char_length(identifier_hash) = 64),
  attempted_at timestamptz not null default now()
);
create index public_vendor_attempts_lookup_idx on public.public_vendor_application_attempts (identifier_hash, attempted_at desc);
alter table public.public_vendor_application_attempts enable row level security;
alter table public.public_vendor_application_attempts force row level security;
revoke all on public.public_vendor_application_attempts from anon, authenticated;
grant select, insert, delete on public.public_vendor_application_attempts to service_role;

create index vendor_users_user_idx on public.vendor_users (user_id, status, organization_id);
create index vendor_documents_supplier_idx on public.vendor_documents (organization_id, supplier_id, status);
create index vendor_catalog_supplier_idx on public.vendor_catalog_items (organization_id, supplier_id, status);
create index procurement_lines_record_idx on public.procurement_record_lines (procurement_record_id, line_number);
create index po_acknowledgements_record_idx on public.purchase_order_acknowledgements (purchase_order_id, responded_at desc);
create index workflow_events_entity_idx on public.workflow_events (organization_id, entity_type, entity_id, occurred_at desc);
create index shipment_lines_shipment_idx on public.shipment_lines (shipment_id);
create index shipment_events_timeline_idx on public.shipment_events (shipment_id, occurred_at desc);
create index receipts_shipment_idx on public.goods_receipts (shipment_id, received_at desc);
create index invoices_supplier_idx on public.vendor_invoices (organization_id, supplier_id, status, due_date);
create index payments_invoice_idx on public.payment_records (invoice_id, status);
create index performance_supplier_idx on public.vendor_performance_snapshots (supplier_id, period_end desc);
create index notifications_user_idx on public.notifications (user_id, read_at, created_at desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'vendor_users','vendor_contacts','vendor_addresses','vendor_documents','vendor_catalog_items',
    'vendor_shipping_rules','procurement_record_lines','demand_forecasts','shipment_lines','goods_receipts',
    'vendor_return_requests','vendor_invoices','payment_records','vendor_improvement_plans'
  ] loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name, table_name
    );
  end loop;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'vendor_contacts','vendor_addresses','vendor_documents','vendor_catalog_items','vendor_shipping_rules',
    'procurement_record_lines','demand_forecasts','procurement_record_links','purchase_order_acknowledgements','shipment_lines',
    'shipment_events','goods_receipts','goods_receipt_lines','vendor_return_requests','vendor_invoices',
    'vendor_invoice_lines','invoice_matches','payment_records','vendor_performance_snapshots','vendor_reviews',
    'vendor_improvement_plans'
  ] loop
    execute format(
      'create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.audit_operational_change()',
      table_name, table_name
    );
  end loop;
end;
$$;

create function public.is_active_vendor_user(target_organization_id uuid, target_supplier_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.vendor_users access
    where access.organization_id = target_organization_id
      and access.supplier_id = target_supplier_id
      and access.user_id = auth.uid()
      and access.status = 'active'
      and public.is_mfa_verified()
  );
$$;

create function public.enforce_vendor_approval_requirements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.onboarding_status = 'approved' and old.onboarding_status <> 'approved' then
    if nullif(trim(new.legal_name), '') is null
      or nullif(trim(new.tax_id), '') is null
      or nullif(trim(new.registration_number), '') is null
      or nullif(trim(new.contact_email), '') is null
    then
      raise exception 'Complete the vendor legal, tax, registration, and contact details before approval';
    end if;
    if not exists (
      select 1 from public.vendor_documents document
      where document.organization_id = new.organization_id
        and document.supplier_id = new.id
        and document.document_type = 'tax_document'
        and document.status = 'verified'
        and (document.expires_at is null or document.expires_at >= current_date)
    ) or not exists (
      select 1 from public.vendor_documents document
      where document.organization_id = new.organization_id
        and document.supplier_id = new.id
        and document.document_type = 'business_registration'
        and document.status = 'verified'
        and (document.expires_at is null or document.expires_at >= current_date)
    ) then
      raise exception 'Verify the tax and business registration documents before approval';
    end if;
  end if;
  return new;
end;
$$;

create trigger suppliers_enforce_approval_requirements
before update of onboarding_status on public.suppliers
for each row execute function public.enforce_vendor_approval_requirements();

create function public.enforce_purchase_order_vendor_readiness()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.record_type = 'purchase_order'
    and new.supplier_id is not null
    and new.status in ('sent','confirmed','processing','packing','ready_for_shipment','in_transit','partially_received','received','completed','closed')
    and not exists (
      select 1 from public.suppliers supplier
      where supplier.organization_id = new.organization_id
        and supplier.id = new.supplier_id
        and supplier.status = 'active'
        and supplier.onboarding_status = 'approved'
    )
  then
    raise exception 'Purchase orders can only be issued to approved active vendors';
  end if;
  return new;
end;
$$;

create trigger procurement_records_enforce_vendor_readiness
before insert or update of status, supplier_id on public.procurement_records
for each row execute function public.enforce_purchase_order_vendor_readiness();

create function public.vendor_has_role(
  target_organization_id uuid,
  target_supplier_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.vendor_users access
    where access.organization_id = target_organization_id
      and access.supplier_id = target_supplier_id
      and access.user_id = auth.uid()
      and access.status = 'active'
      and access.role = any(allowed_roles)
      and public.is_mfa_verified()
  );
$$;

create function public.activate_my_vendor_access()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  activated_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.vendor_users
  set status = 'active', activated_at = coalesce(activated_at, now())
  where user_id = auth.uid() and status = 'invited';
  get diagnostics activated_count = row_count;
  return activated_count;
end;
$$;

create function public.generate_reorder_requisitions(target_organization_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  candidate record;
  record_id uuid;
  generated_count integer := 0;
  requested_quantity numeric(18,4);
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if not public.has_org_role(target_organization_id, array['owner','admin','procurement_manager','buyer']::public.organization_role[]) then
    raise exception 'Insufficient procurement permission';
  end if;

  for candidate in
    select product.id as product_id, product.sku, product.name, product.reorder_point,
           warehouse.id as warehouse_id,
           coalesce(balance.on_hand - balance.reserved, 0) as available,
           coalesce((
             select sum(forecast.forecast_quantity)
             from public.demand_forecasts forecast
             where forecast.organization_id = target_organization_id
               and forecast.product_id = product.id
               and forecast.warehouse_id = warehouse.id
               and forecast.forecast_date between current_date and current_date + 30
           ), 0) as forecast_quantity
    from public.products product
    cross join public.warehouses warehouse
    left join public.inventory_balances balance
      on balance.organization_id = product.organization_id
      and balance.product_id = product.id
      and balance.warehouse_id = warehouse.id
    where product.organization_id = target_organization_id
      and product.is_active
      and warehouse.organization_id = target_organization_id
      and warehouse.is_active
      and coalesce(balance.on_hand - balance.reserved, 0) < product.reorder_point
      and not exists (
        select 1
        from public.procurement_record_lines line
        join public.procurement_records requisition on requisition.id = line.procurement_record_id
        where requisition.organization_id = target_organization_id
          and requisition.record_type = 'requisition'
          and requisition.status not in ('completed','closed','rejected','cancelled')
          and line.product_id = product.id
          and requisition.warehouse_id = warehouse.id
      )
  loop
    requested_quantity := greatest(candidate.reorder_point - candidate.available + candidate.forecast_quantity, 1);
    insert into public.procurement_records
      (organization_id, record_type, reference, title, warehouse_id, status, amount, currency, notes, created_by)
    values
      (target_organization_id, 'requisition', 'AUTO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
       'Replenish ' || candidate.name, candidate.warehouse_id, 'draft', 0, 'PHP',
       'Automatically generated from reorder point and 30-day demand forecast.', actor_id)
    returning id into record_id;

    insert into public.procurement_record_lines
      (organization_id, procurement_record_id, product_id, line_number, description, quantity)
    values
      (target_organization_id, record_id, candidate.product_id, 1, candidate.sku || ' · ' || candidate.name, requested_quantity);
    generated_count := generated_count + 1;
  end loop;
  return generated_count;
end;
$$;

create function public.vendor_update_my_profile(
  target_organization_id uuid,
  target_supplier_id uuid,
  new_contact_email text,
  new_phone text,
  new_website text,
  new_address_line text,
  new_city text,
  new_province text,
  new_postal_code text,
  new_delivery_capacity numeric,
  new_delivery_methods text[],
  new_service_areas text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.vendor_has_role(target_organization_id, target_supplier_id, array['admin']) then raise exception 'Vendor administrator access required'; end if;
  update public.suppliers
  set contact_email = lower(trim(new_contact_email)), phone = nullif(trim(new_phone), ''),
      website = nullif(trim(new_website), ''), address_line = nullif(trim(new_address_line), ''),
      city = nullif(trim(new_city), ''), province = nullif(trim(new_province), ''),
      postal_code = nullif(trim(new_postal_code), ''), delivery_capacity = new_delivery_capacity,
      delivery_methods = coalesce(new_delivery_methods, '{}'), service_areas = coalesce(new_service_areas, '{}'),
      onboarding_status = case when onboarding_status = 'changes_requested' then 'submitted' else onboarding_status end
  where organization_id = target_organization_id and id = target_supplier_id;
end;
$$;

create function public.acknowledge_purchase_order(
  target_organization_id uuid,
  target_supplier_id uuid,
  target_purchase_order_id uuid,
  target_response text,
  target_proposed_amount numeric default null,
  target_proposed_delivery_date date default null,
  target_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  acknowledgement_id uuid;
  old_status text;
begin
  if actor_id is null or not public.vendor_has_role(target_organization_id, target_supplier_id, array['admin','member']) then raise exception 'Vendor order access required'; end if;
  if target_response not in ('confirmed','revised','rejected') then raise exception 'Invalid acknowledgement response'; end if;
  select status into old_status from public.procurement_records
  where id = target_purchase_order_id and organization_id = target_organization_id
    and supplier_id = target_supplier_id and record_type = 'purchase_order'
  for update;
  if not found then raise exception 'Purchase order not found'; end if;
  if old_status not in ('sent','revised') then raise exception 'Purchase order is not awaiting acknowledgement'; end if;

  insert into public.purchase_order_acknowledgements
    (organization_id, purchase_order_id, supplier_id, response, proposed_amount, proposed_delivery_date, message, responded_by)
  values
    (target_organization_id, target_purchase_order_id, target_supplier_id, target_response,
     target_proposed_amount, target_proposed_delivery_date, nullif(trim(target_message), ''), actor_id)
  returning id into acknowledgement_id;

  update public.procurement_records set status = target_response where id = target_purchase_order_id;
  insert into public.workflow_events
    (organization_id, supplier_id, entity_type, entity_id, from_status, to_status, message, actor_id)
  values
    (target_organization_id, target_supplier_id, 'purchase_order', target_purchase_order_id,
     old_status, target_response, nullif(trim(target_message), ''), actor_id);
  insert into public.notifications (organization_id, supplier_id, audience, title, message, href)
  values (target_organization_id, target_supplier_id, 'internal', 'Purchase order ' || target_response,
          coalesce(nullif(trim(target_message), ''), 'The vendor submitted a purchase order response.'), '/dashboard/vendors?vendor=' || target_supplier_id::text);
  return acknowledgement_id;
end;
$$;

create function public.record_goods_receipt(
  target_organization_id uuid,
  target_shipment_line_id uuid,
  target_accepted_quantity numeric,
  target_rejected_quantity numeric,
  target_reference text,
  target_quality_ok boolean,
  target_condition_ok boolean,
  target_packaging_ok boolean,
  target_rejection_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  line_record record;
  receipt_id uuid;
  remaining numeric(18,4);
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if not public.has_org_role(target_organization_id, array['owner','admin','warehouse_manager','operator']::public.organization_role[]) then
    raise exception 'Insufficient receiving permission';
  end if;
  if target_accepted_quantity < 0 or target_rejected_quantity < 0 or target_accepted_quantity + target_rejected_quantity <= 0 then
    raise exception 'Enter an accepted or rejected quantity';
  end if;

  select line.*, shipment.warehouse_id, shipment.purchase_order_id, shipment.supplier_id
  into line_record
  from public.shipment_lines line
  join public.shipments shipment on shipment.id = line.shipment_id and shipment.organization_id = line.organization_id
  where line.id = target_shipment_line_id and line.organization_id = target_organization_id
  for update of line;
  if not found then raise exception 'Shipment line not found'; end if;
  if line_record.warehouse_id is null then raise exception 'Shipment has no receiving warehouse'; end if;
  remaining := line_record.quantity - line_record.received_quantity;
  if target_accepted_quantity + target_rejected_quantity > remaining then raise exception 'Receipt exceeds remaining shipment quantity'; end if;
  if target_accepted_quantity > 0 and line_record.product_id is null then raise exception 'Map the shipment line to an inventory product before accepting it'; end if;

  insert into public.goods_receipts
    (organization_id, shipment_id, purchase_order_id, warehouse_id, reference, status, received_by)
  values
    (target_organization_id, line_record.shipment_id, line_record.purchase_order_id, line_record.warehouse_id,
     trim(target_reference), case
       when target_accepted_quantity = 0 then 'rejected'
       when target_rejected_quantity > 0 then 'partial'
       else 'accepted'
     end, actor_id)
  returning id into receipt_id;

  insert into public.goods_receipt_lines
    (organization_id, goods_receipt_id, shipment_line_id, product_id, expected_quantity,
     accepted_quantity, rejected_quantity, rejection_reason, quality_ok, condition_ok, packaging_ok)
  values
    (target_organization_id, receipt_id, target_shipment_line_id, line_record.product_id, remaining,
     target_accepted_quantity, target_rejected_quantity, nullif(trim(target_rejection_reason), ''),
     target_quality_ok, target_condition_ok, target_packaging_ok);

  update public.shipment_lines
  set received_quantity = received_quantity + target_accepted_quantity + target_rejected_quantity
  where id = target_shipment_line_id;

  if target_accepted_quantity > 0 then
    perform pg_advisory_xact_lock(hashtextextended(target_organization_id::text || line_record.warehouse_id::text || line_record.product_id::text, 0));
    insert into public.inventory_balances (organization_id, warehouse_id, product_id, on_hand)
    values (target_organization_id, line_record.warehouse_id, line_record.product_id, target_accepted_quantity)
    on conflict (organization_id, warehouse_id, product_id)
    do update set on_hand = public.inventory_balances.on_hand + excluded.on_hand;

    insert into public.inventory_movements
      (organization_id, warehouse_id, product_id, movement_type, quantity, reference, notes, created_by)
    values
      (target_organization_id, line_record.warehouse_id, line_record.product_id, 'receipt', target_accepted_quantity,
       trim(target_reference), 'Accepted vendor goods receipt', actor_id);
  end if;

  update public.procurement_record_lines
  set received_quantity = received_quantity + target_accepted_quantity
  where id = line_record.purchase_order_line_id;

  update public.shipments
  set status = case
    when not exists (select 1 from public.shipment_lines remaining_line where remaining_line.shipment_id = line_record.shipment_id and remaining_line.received_quantity < remaining_line.quantity) then 'delivered'
    else 'arrived'
  end,
  actual_arrival_at = coalesce(actual_arrival_at, now())
  where id = line_record.shipment_id;

  return receipt_id;
end;
$$;

revoke all on function public.is_active_vendor_user(uuid, uuid) from public;
revoke all on function public.enforce_vendor_approval_requirements() from public;
revoke all on function public.enforce_purchase_order_vendor_readiness() from public;
revoke all on function public.vendor_has_role(uuid, uuid, text[]) from public;
revoke all on function public.activate_my_vendor_access() from public;
revoke all on function public.generate_reorder_requisitions(uuid) from public;
revoke all on function public.vendor_update_my_profile(uuid, uuid, text, text, text, text, text, text, text, numeric, text[], text[]) from public;
revoke all on function public.acknowledge_purchase_order(uuid, uuid, uuid, text, numeric, date, text) from public;
revoke all on function public.record_goods_receipt(uuid, uuid, numeric, numeric, text, boolean, boolean, boolean, text) from public;
grant execute on function public.is_active_vendor_user(uuid, uuid) to authenticated;
grant execute on function public.vendor_has_role(uuid, uuid, text[]) to authenticated;
grant execute on function public.activate_my_vendor_access() to authenticated;
grant execute on function public.generate_reorder_requisitions(uuid) to authenticated;
grant execute on function public.vendor_update_my_profile(uuid, uuid, text, text, text, text, text, text, text, numeric, text[], text[]) to authenticated;
grant execute on function public.acknowledge_purchase_order(uuid, uuid, uuid, text, numeric, date, text) to authenticated;
grant execute on function public.record_goods_receipt(uuid, uuid, numeric, numeric, text, boolean, boolean, boolean, text) to authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'vendor_users','vendor_contacts','vendor_addresses','vendor_documents','vendor_catalog_items','vendor_shipping_rules',
    'procurement_record_lines','demand_forecasts','procurement_record_links','purchase_order_acknowledgements','workflow_events',
    'shipment_lines','shipment_events','goods_receipts','goods_receipt_lines','vendor_return_requests',
    'vendor_invoices','vendor_invoice_lines','invoice_matches','payment_records','vendor_performance_snapshots',
    'vendor_reviews','vendor_improvement_plans','notifications'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
  end loop;
end;
$$;

drop policy if exists "vendor_documents_manage_scope" on public.vendor_documents;
create policy "vendor_documents_select_scope" on public.vendor_documents
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer']::public.organization_role[])
  or public.is_active_vendor_user(organization_id, supplier_id)
);
create policy "vendor_documents_manage_internal" on public.vendor_documents
for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer']::public.organization_role[]));
create policy "vendor_documents_insert_vendor" on public.vendor_documents
for insert to authenticated with check (
  uploaded_by = auth.uid() and status = 'submitted' and public.vendor_has_role(organization_id, supplier_id, array['admin','member'])
);
create policy "vendor_documents_update_vendor" on public.vendor_documents
for update to authenticated
using (uploaded_by = auth.uid() and status = 'submitted' and public.vendor_has_role(organization_id, supplier_id, array['admin','member']))
with check (uploaded_by = auth.uid() and status = 'submitted' and public.vendor_has_role(organization_id, supplier_id, array['admin','member']));
create policy "vendor_documents_delete_vendor" on public.vendor_documents
for delete to authenticated using (
  uploaded_by = auth.uid() and status = 'submitted' and public.vendor_has_role(organization_id, supplier_id, array['admin','member'])
);

create policy "suppliers_select_own_vendor" on public.suppliers
for select to authenticated using (public.is_active_vendor_user(organization_id, id));

create policy "vendor_users_select_scope" on public.vendor_users
for select to authenticated using (
  user_id = auth.uid() or public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer']::public.organization_role[])
);
create policy "vendor_users_manage_internal" on public.vendor_users
for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin','procurement_manager']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','procurement_manager']::public.organization_role[]));

do $$
declare table_name text;
begin
  foreach table_name in array array['vendor_contacts','vendor_addresses','vendor_catalog_items','vendor_shipping_rules'] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.has_org_role(organization_id, array[''owner'',''admin'',''procurement_manager'',''buyer'']::public.organization_role[]) or public.is_active_vendor_user(organization_id, supplier_id))',
      table_name || '_select_scope', table_name
    );
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.has_org_role(organization_id, array[''owner'',''admin'',''procurement_manager'',''buyer'']::public.organization_role[]) or public.is_active_vendor_user(organization_id, supplier_id)) with check (public.has_org_role(organization_id, array[''owner'',''admin'',''procurement_manager'',''buyer'']::public.organization_role[]) or public.is_active_vendor_user(organization_id, supplier_id))',
      table_name || '_manage_scope', table_name
    );
  end loop;
end;
$$;

drop policy "vendor_contacts_manage_scope" on public.vendor_contacts;
create policy "vendor_contacts_manage_scope" on public.vendor_contacts
for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer']::public.organization_role[]) or public.vendor_has_role(organization_id, supplier_id, array['admin']))
with check (public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer']::public.organization_role[]) or public.vendor_has_role(organization_id, supplier_id, array['admin']));

drop policy "vendor_addresses_manage_scope" on public.vendor_addresses;
create policy "vendor_addresses_manage_scope" on public.vendor_addresses
for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer']::public.organization_role[]) or public.vendor_has_role(organization_id, supplier_id, array['admin']))
with check (public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer']::public.organization_role[]) or public.vendor_has_role(organization_id, supplier_id, array['admin']));

drop policy "vendor_shipping_rules_manage_scope" on public.vendor_shipping_rules;
create policy "vendor_shipping_rules_manage_scope" on public.vendor_shipping_rules
for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer']::public.organization_role[]) or public.vendor_has_role(organization_id, supplier_id, array['admin']))
with check (public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer']::public.organization_role[]) or public.vendor_has_role(organization_id, supplier_id, array['admin']));

drop policy "vendor_catalog_items_manage_scope" on public.vendor_catalog_items;
create policy "vendor_catalog_items_manage_scope" on public.vendor_catalog_items
for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer']::public.organization_role[]) or public.vendor_has_role(organization_id, supplier_id, array['admin','member']))
with check (public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer']::public.organization_role[]) or public.vendor_has_role(organization_id, supplier_id, array['admin','member']));

create policy "procurement_records_select_vendor" on public.procurement_records
for select to authenticated using (supplier_id is not null and public.is_active_vendor_user(organization_id, supplier_id));
create policy "procurement_lines_select_scope" on public.procurement_record_lines
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','viewer']::public.organization_role[])
  or exists (select 1 from public.procurement_records record where record.id = procurement_record_id and public.is_active_vendor_user(record.organization_id, record.supplier_id))
);
create policy "procurement_lines_manage_internal" on public.procurement_record_lines
for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer']::public.organization_role[]));
create policy "demand_forecasts_select_business" on public.demand_forecasts
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','warehouse_manager','viewer']::public.organization_role[])
);
create policy "demand_forecasts_manage_procurement" on public.demand_forecasts
for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer']::public.organization_role[]))
with check (created_by = auth.uid() and public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer']::public.organization_role[]));
create policy "procurement_links_internal" on public.procurement_record_links
for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer']::public.organization_role[]));

create policy "po_ack_select_scope" on public.purchase_order_acknowledgements
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','viewer']::public.organization_role[])
  or public.is_active_vendor_user(organization_id, supplier_id)
);
create policy "po_ack_insert_vendor" on public.purchase_order_acknowledgements
for insert to authenticated with check (
  responded_by = auth.uid() and public.vendor_has_role(organization_id, supplier_id, array['admin','member'])
);

create policy "workflow_events_select_scope" on public.workflow_events
for select to authenticated using (
  public.is_active_member(organization_id)
  or (supplier_id is not null and public.is_active_vendor_user(organization_id, supplier_id))
);
create policy "workflow_events_insert_scope" on public.workflow_events
for insert to authenticated with check (
  actor_id = auth.uid() and (public.is_active_member(organization_id) or (supplier_id is not null and public.is_active_vendor_user(organization_id, supplier_id)))
);

create policy "shipments_select_vendor" on public.shipments
for select to authenticated using (supplier_id is not null and public.is_active_vendor_user(organization_id, supplier_id));
create policy "shipments_insert_vendor" on public.shipments
for insert to authenticated with check (
  supplier_id is not null and created_by = auth.uid() and public.vendor_has_role(organization_id, supplier_id, array['admin','logistics'])
  and (purchase_order_id is null or exists (
    select 1 from public.procurement_records purchase_order
    where purchase_order.id = shipments.purchase_order_id
      and purchase_order.organization_id = shipments.organization_id
      and purchase_order.supplier_id = shipments.supplier_id
      and purchase_order.record_type = 'purchase_order'
  ))
);
create policy "shipments_update_vendor" on public.shipments
for update to authenticated
using (supplier_id is not null and public.vendor_has_role(organization_id, supplier_id, array['admin','logistics']))
with check (
  supplier_id is not null and public.vendor_has_role(organization_id, supplier_id, array['admin','logistics'])
  and (purchase_order_id is null or exists (
    select 1 from public.procurement_records purchase_order
    where purchase_order.id = shipments.purchase_order_id
      and purchase_order.organization_id = shipments.organization_id
      and purchase_order.supplier_id = shipments.supplier_id
      and purchase_order.record_type = 'purchase_order'
  ))
);
create policy "shipments_delete_vendor_draft" on public.shipments
for delete to authenticated using (
  status in ('planned','processing') and supplier_id is not null and created_by = auth.uid()
  and public.vendor_has_role(organization_id, supplier_id, array['admin','logistics'])
);

create policy "shipment_lines_select_scope" on public.shipment_lines
for select to authenticated using (
  public.is_active_member(organization_id)
  or exists (select 1 from public.shipments shipment where shipment.id = shipment_id and public.is_active_vendor_user(shipment.organization_id, shipment.supplier_id))
);
create policy "shipment_lines_manage_scope" on public.shipment_lines
for all to authenticated
using (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','warehouse_manager']::public.organization_role[])
  or exists (select 1 from public.shipments shipment where shipment.id = shipment_id and public.vendor_has_role(shipment.organization_id, shipment.supplier_id, array['admin','logistics']))
)
with check (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','warehouse_manager']::public.organization_role[])
  or exists (select 1 from public.shipments shipment where shipment.id = shipment_id and public.vendor_has_role(shipment.organization_id, shipment.supplier_id, array['admin','logistics']))
);
create policy "shipment_events_select_scope" on public.shipment_events
for select to authenticated using (
  public.is_active_member(organization_id)
  or exists (select 1 from public.shipments shipment where shipment.id = shipment_id and public.is_active_vendor_user(shipment.organization_id, shipment.supplier_id))
);
create policy "shipment_events_insert_scope" on public.shipment_events
for insert to authenticated with check (
  recorded_by = auth.uid() and (
    public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','warehouse_manager']::public.organization_role[])
    or exists (select 1 from public.shipments shipment where shipment.id = shipment_id and public.vendor_has_role(shipment.organization_id, shipment.supplier_id, array['admin','logistics']))
  )
);

create policy "goods_receipts_select_scope" on public.goods_receipts
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','warehouse_manager','operator','viewer']::public.organization_role[])
  or exists (
    select 1 from public.shipments shipment
    where shipment.id = shipment_id and public.is_active_vendor_user(shipment.organization_id, shipment.supplier_id)
  )
);
create policy "goods_receipt_lines_select_scope" on public.goods_receipt_lines
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','warehouse_manager','operator','viewer']::public.organization_role[])
  or exists (
    select 1 from public.goods_receipts receipt
    join public.shipments shipment on shipment.id = receipt.shipment_id
    where receipt.id = goods_receipt_id and public.is_active_vendor_user(shipment.organization_id, shipment.supplier_id)
  )
);
create policy "returns_select_scope" on public.vendor_return_requests
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','warehouse_manager','operator','viewer']::public.organization_role[])
  or public.is_active_vendor_user(organization_id, supplier_id)
);
create policy "returns_manage_internal" on public.vendor_return_requests
for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','warehouse_manager']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','warehouse_manager']::public.organization_role[]));

create policy "invoices_select_scope" on public.vendor_invoices
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','viewer']::public.organization_role[])
  or public.is_active_vendor_user(organization_id, supplier_id)
);
create policy "invoices_insert_vendor" on public.vendor_invoices
for insert to authenticated with check (
  submitted_by = auth.uid() and status in ('draft','submitted') and public.vendor_has_role(organization_id, supplier_id, array['admin','finance'])
  and exists (
    select 1 from public.procurement_records purchase_order
    where purchase_order.id = vendor_invoices.purchase_order_id
      and purchase_order.organization_id = vendor_invoices.organization_id
      and purchase_order.supplier_id = vendor_invoices.supplier_id
      and purchase_order.record_type = 'purchase_order'
  )
);
create policy "invoices_update_vendor" on public.vendor_invoices
for update to authenticated
using (submitted_by = auth.uid() and status in ('draft','submitted') and public.vendor_has_role(organization_id, supplier_id, array['admin','finance']))
with check (submitted_by = auth.uid() and status in ('draft','submitted') and public.vendor_has_role(organization_id, supplier_id, array['admin','finance']));
create policy "invoices_delete_vendor_draft" on public.vendor_invoices
for delete to authenticated using (
  submitted_by = auth.uid() and status in ('draft','submitted') and public.vendor_has_role(organization_id, supplier_id, array['admin','finance'])
);
create policy "invoices_manage_internal" on public.vendor_invoices
for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer']::public.organization_role[]));

create policy "invoice_lines_select_scope" on public.vendor_invoice_lines
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','viewer']::public.organization_role[])
  or exists (select 1 from public.vendor_invoices invoice where invoice.id = invoice_id and public.is_active_vendor_user(invoice.organization_id, invoice.supplier_id))
);
create policy "invoice_lines_manage_scope" on public.vendor_invoice_lines
for all to authenticated
using (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer']::public.organization_role[])
  or exists (select 1 from public.vendor_invoices invoice where invoice.id = invoice_id and invoice.status in ('draft','submitted') and public.vendor_has_role(invoice.organization_id, invoice.supplier_id, array['admin','finance']))
)
with check (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer']::public.organization_role[])
  or exists (select 1 from public.vendor_invoices invoice where invoice.id = invoice_id and invoice.status in ('draft','submitted') and public.vendor_has_role(invoice.organization_id, invoice.supplier_id, array['admin','finance']))
);

create policy "invoice_matches_select_scope" on public.invoice_matches
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','viewer']::public.organization_role[])
  or exists (select 1 from public.vendor_invoices invoice where invoice.id = invoice_id and public.is_active_vendor_user(invoice.organization_id, invoice.supplier_id))
);
create policy "payments_select_scope" on public.payment_records
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','viewer']::public.organization_role[])
  or public.is_active_vendor_user(organization_id, supplier_id)
);
create policy "performance_select_scope" on public.vendor_performance_snapshots
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','viewer']::public.organization_role[])
  or public.is_active_vendor_user(organization_id, supplier_id)
);
create policy "reviews_select_scope" on public.vendor_reviews
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','viewer']::public.organization_role[])
  or public.is_active_vendor_user(organization_id, supplier_id)
);
create policy "improvement_plans_select_scope" on public.vendor_improvement_plans
for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','procurement_manager','buyer','viewer']::public.organization_role[])
  or public.is_active_vendor_user(organization_id, supplier_id)
);

do $$
declare table_name text;
begin
  foreach table_name in array array['invoice_matches','payment_records','vendor_performance_snapshots','vendor_reviews','vendor_improvement_plans'] loop
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.has_org_role(organization_id, array[''owner'',''admin'',''procurement_manager'',''buyer'']::public.organization_role[])) with check (public.has_org_role(organization_id, array[''owner'',''admin'',''procurement_manager'',''buyer'']::public.organization_role[]))',
      table_name || '_manage_internal', table_name
    );
  end loop;
end;
$$;

create policy "notifications_select_scope" on public.notifications
for select to authenticated using (
  (audience = 'internal' and public.is_active_member(organization_id) and (user_id is null or user_id = auth.uid()))
  or (audience = 'vendor' and supplier_id is not null and public.is_active_vendor_user(organization_id, supplier_id) and (user_id is null or user_id = auth.uid()))
);
create policy "notifications_insert_scope" on public.notifications
for insert to authenticated with check (
  public.is_active_member(organization_id)
  or (supplier_id is not null and public.is_active_vendor_user(organization_id, supplier_id))
);
create policy "notifications_update_own" on public.notifications
for update to authenticated
using (user_id = auth.uid() or (user_id is null and ((audience = 'internal' and public.is_active_member(organization_id)) or (audience = 'vendor' and supplier_id is not null and public.is_active_vendor_user(organization_id, supplier_id)))))
with check (user_id = auth.uid() or user_id is null);

grant select, insert, update, delete on public.vendor_contacts, public.vendor_addresses,
  public.vendor_documents, public.vendor_catalog_items, public.vendor_shipping_rules,
  public.shipment_lines, public.vendor_invoice_lines to authenticated;
grant select, insert, update on public.vendor_users, public.purchase_order_acknowledgements,
  public.workflow_events, public.shipment_events, public.vendor_invoices, public.notifications to authenticated;
grant select, insert, update, delete on public.procurement_record_lines, public.procurement_record_links,
  public.demand_forecasts,
  public.vendor_return_requests, public.invoice_matches, public.payment_records,
  public.vendor_performance_snapshots, public.vendor_reviews, public.vendor_improvement_plans to authenticated;
grant select on public.goods_receipts, public.goods_receipt_lines to authenticated;

create policy "vendor_files_select_scope" on storage.objects
for select to authenticated using (
  bucket_id = 'organization-documents'
  and (storage.foldername(name))[2] = 'vendors'
  and public.is_active_vendor_user(((storage.foldername(name))[1])::uuid, ((storage.foldername(name))[3])::uuid)
);
create policy "vendor_files_insert_scope" on storage.objects
for insert to authenticated with check (
  bucket_id = 'organization-documents'
  and owner_id = auth.uid()::text
  and (storage.foldername(name))[2] = 'vendors'
  and (
    public.vendor_has_role(((storage.foldername(name))[1])::uuid, ((storage.foldername(name))[3])::uuid, array['admin','member'])
    or ((storage.foldername(name))[4] = 'invoices' and public.vendor_has_role(((storage.foldername(name))[1])::uuid, ((storage.foldername(name))[3])::uuid, array['finance']))
  )
);
create policy "vendor_files_delete_own" on storage.objects
for delete to authenticated using (
  bucket_id = 'organization-documents'
  and owner_id = auth.uid()::text
  and (storage.foldername(name))[2] = 'vendors'
  and (
    public.vendor_has_role(((storage.foldername(name))[1])::uuid, ((storage.foldername(name))[3])::uuid, array['admin','member'])
    or ((storage.foldername(name))[4] = 'invoices' and public.vendor_has_role(((storage.foldername(name))[1])::uuid, ((storage.foldername(name))[3])::uuid, array['finance']))
  )
);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'suppliers','vendor_users','vendor_documents','vendor_catalog_items','procurement_record_lines','demand_forecasts',
    'purchase_order_acknowledgements','shipments','shipment_lines','shipment_events','goods_receipts',
    'vendor_invoices','payment_records','vendor_performance_snapshots','vendor_reviews','vendor_improvement_plans','notifications'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;

commit;
