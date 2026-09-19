begin;

alter table public.inventory_balances
  add column if not exists location_id uuid;
alter table public.inventory_movements
  add column if not exists location_id uuid;

-- Existing stock can be assigned safely when a warehouse has exactly one
-- active location. Warehouses with multiple locations remain unallocated
-- until a controlled location movement is posted.
with single_locations as (
  select organization_id, warehouse_id, min(id::text)::uuid as location_id
  from public.warehouse_locations
  where is_active
  group by organization_id, warehouse_id
  having count(*) = 1
)
update public.inventory_balances balance
set location_id = location.location_id
from single_locations location
where balance.organization_id = location.organization_id
  and balance.warehouse_id = location.warehouse_id
  and balance.location_id is null;

with single_locations as (
  select organization_id, warehouse_id, min(id::text)::uuid as location_id
  from public.warehouse_locations
  where is_active
  group by organization_id, warehouse_id
  having count(*) = 1
)
update public.inventory_movements movement
set location_id = location.location_id
from single_locations location
where movement.organization_id = location.organization_id
  and movement.warehouse_id = location.warehouse_id
  and movement.location_id is null;

alter table public.warehouse_locations
  drop constraint if exists warehouse_locations_organization_warehouse_id_key;
alter table public.warehouse_locations
  add constraint warehouse_locations_organization_warehouse_id_key
  unique (organization_id, warehouse_id, id);

alter table public.inventory_balances
  drop constraint if exists inventory_balances_organization_id_warehouse_id_product_id_key;
alter table public.inventory_balances
  drop constraint if exists inventory_balances_location_product_key;
alter table public.inventory_balances
  add constraint inventory_balances_location_product_key
  unique nulls not distinct (organization_id, warehouse_id, location_id, product_id);

alter table public.inventory_balances
  drop constraint if exists inventory_balances_location_scope_fkey;
alter table public.inventory_balances
  add constraint inventory_balances_location_scope_fkey
  foreign key (organization_id, warehouse_id, location_id)
  references public.warehouse_locations(organization_id, warehouse_id, id)
  on delete restrict;

alter table public.inventory_movements
  drop constraint if exists inventory_movements_location_scope_fkey;
alter table public.inventory_movements
  add constraint inventory_movements_location_scope_fkey
  foreign key (organization_id, warehouse_id, location_id)
  references public.warehouse_locations(organization_id, warehouse_id, id)
  on delete restrict;

create index if not exists inventory_balances_location_idx
  on public.inventory_balances (organization_id, location_id, product_id);
create index if not exists inventory_movements_location_idx
  on public.inventory_movements (organization_id, location_id, occurred_at desc);

create or replace function public.post_inventory_movement_at_location(
  target_organization_id uuid,
  target_warehouse_id uuid,
  target_location_id uuid,
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
    select 1 from public.warehouse_locations location
    join public.warehouses warehouse
      on warehouse.organization_id = location.organization_id
      and warehouse.id = location.warehouse_id
    where location.organization_id = target_organization_id
      and location.warehouse_id = target_warehouse_id
      and location.id = target_location_id
      and location.is_active and warehouse.is_active
  ) then raise exception 'Select an active location in this warehouse'; end if;
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

  perform pg_advisory_xact_lock(hashtextextended(
    target_organization_id::text || target_warehouse_id::text ||
    target_location_id::text || target_product_id::text, 0
  ));
  select balance.on_hand into current_on_hand
  from public.inventory_balances balance
  where balance.organization_id = target_organization_id
    and balance.warehouse_id = target_warehouse_id
    and balance.location_id = target_location_id
    and balance.product_id = target_product_id;
  current_on_hand := coalesce(current_on_hand, 0);
  if current_on_hand + quantity_delta < 0 then
    raise exception 'Movement would make location stock negative';
  end if;

  insert into public.inventory_balances
    (organization_id, warehouse_id, location_id, product_id, on_hand)
  values
    (target_organization_id, target_warehouse_id, target_location_id,
     target_product_id, quantity_delta)
  on conflict on constraint inventory_balances_location_product_key
  do update set on_hand = public.inventory_balances.on_hand + excluded.on_hand;

  insert into public.inventory_movements
    (organization_id, warehouse_id, location_id, product_id, movement_type,
     quantity, reference, notes, created_by)
  values
    (target_organization_id, target_warehouse_id, target_location_id,
     target_product_id, target_movement_type, quantity_delta,
     trim(target_reference), nullif(trim(target_notes), ''), actor_id)
  returning id into movement_id;
  return movement_id;
end;
$$;

revoke all on function public.post_inventory_movement_at_location(
  uuid, uuid, uuid, uuid, public.inventory_movement_type, numeric, text, text
) from public;
grant execute on function public.post_inventory_movement_at_location(
  uuid, uuid, uuid, uuid, public.inventory_movement_type, numeric, text, text
) to authenticated;

commit;
