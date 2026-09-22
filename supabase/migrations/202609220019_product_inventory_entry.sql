begin;

alter table public.products
  add column if not exists unit_price numeric(18, 2) not null default 0
    check (unit_price >= 0),
  add column if not exists default_supplier_id uuid,
  add column if not exists default_warehouse_id uuid,
  add column if not exists default_location_id uuid,
  add column if not exists expiry_date date;

alter table public.products
  drop constraint if exists products_default_supplier_scope_fkey;
alter table public.products
  add constraint products_default_supplier_scope_fkey
  foreign key (organization_id, default_supplier_id)
  references public.suppliers(organization_id, id)
  on delete set null (default_supplier_id);

alter table public.products
  drop constraint if exists products_default_warehouse_scope_fkey;
alter table public.products
  add constraint products_default_warehouse_scope_fkey
  foreign key (organization_id, default_warehouse_id)
  references public.warehouses(organization_id, id)
  on delete restrict;

alter table public.products
  drop constraint if exists products_default_location_scope_fkey;
alter table public.products
  add constraint products_default_location_scope_fkey
  foreign key (organization_id, default_warehouse_id, default_location_id)
  references public.warehouse_locations(organization_id, warehouse_id, id)
  on delete set null (default_location_id);

alter table public.products
  drop constraint if exists products_default_location_requires_warehouse;
alter table public.products
  add constraint products_default_location_requires_warehouse
  check (default_location_id is null or default_warehouse_id is not null);

create index if not exists products_default_supplier_idx
  on public.products (organization_id, default_supplier_id);
create index if not exists products_default_location_idx
  on public.products (organization_id, default_warehouse_id, default_location_id);

create or replace function public.create_inventory_product(
  target_organization_id uuid,
  product_sku text,
  product_name text,
  product_category text,
  product_reorder_level numeric,
  product_unit_price numeric,
  target_supplier_id uuid,
  target_warehouse_id uuid,
  target_location_id uuid,
  initial_quantity numeric,
  product_expiry_date date,
  product_is_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  product_id uuid;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if not public.has_org_role(
    target_organization_id,
    array['owner','admin','procurement_manager','buyer','warehouse_manager']::public.organization_role[]
  ) then raise exception 'Product management permission required'; end if;
  if char_length(trim(product_sku)) not between 2 and 40 then
    raise exception 'SKU must be between 2 and 40 characters';
  end if;
  if char_length(trim(product_name)) not between 2 and 160 then
    raise exception 'Product name must be between 2 and 160 characters';
  end if;
  if coalesce(product_reorder_level, 0) < 0 then raise exception 'Reorder level cannot be negative'; end if;
  if coalesce(product_unit_price, 0) < 0 then raise exception 'Unit price cannot be negative'; end if;
  if coalesce(initial_quantity, 0) < 0 then raise exception 'Opening quantity cannot be negative'; end if;
  if target_supplier_id is null or not exists (
    select 1 from public.suppliers supplier
    where supplier.organization_id = target_organization_id
      and supplier.id = target_supplier_id
      and supplier.status = 'active'
  ) then raise exception 'Select an active supplier'; end if;
  if target_location_id is null or target_warehouse_id is null or not exists (
    select 1
    from public.warehouse_locations location
    join public.warehouses warehouse
      on warehouse.organization_id = location.organization_id
      and warehouse.id = location.warehouse_id
    where location.organization_id = target_organization_id
      and location.warehouse_id = target_warehouse_id
      and location.id = target_location_id
      and location.is_active
      and warehouse.is_active
  ) then raise exception 'Select an active warehouse location'; end if;

  insert into public.products
    (organization_id, sku, name, category, reorder_point, unit_price,
     default_supplier_id, default_warehouse_id, default_location_id,
     expiry_date, is_active)
  values
    (target_organization_id, upper(trim(product_sku)), trim(product_name),
     nullif(trim(product_category), ''), coalesce(product_reorder_level, 0),
     coalesce(product_unit_price, 0), target_supplier_id, target_warehouse_id,
     target_location_id, product_expiry_date, product_is_active)
  returning id into product_id;

  if coalesce(initial_quantity, 0) > 0 then
    perform public.post_inventory_movement_at_location(
      target_organization_id,
      target_warehouse_id,
      target_location_id,
      product_id,
      'receipt'::public.inventory_movement_type,
      initial_quantity,
      left('OPENING-' || upper(trim(product_sku)), 60),
      'Opening stock recorded during product creation'
    );
  end if;

  return product_id;
end;
$$;

revoke all on function public.create_inventory_product(
  uuid, text, text, text, numeric, numeric, uuid, uuid, uuid, numeric, date, boolean
) from public;
grant execute on function public.create_inventory_product(
  uuid, text, text, text, numeric, numeric, uuid, uuid, uuid, numeric, date, boolean
) to authenticated;

commit;
