begin;

create or replace function public.ensure_default_warehouse_location()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_active and not exists (
    select 1
    from public.warehouse_locations location
    where location.organization_id = new.organization_id
      and location.warehouse_id = new.id
      and location.is_active
  ) then
    insert into public.warehouse_locations
      (organization_id, warehouse_id, code, name, location_type, is_active)
    values
      (new.organization_id, new.id, 'MAIN', 'Main storage', 'storage', true)
    on conflict (organization_id, warehouse_id, code)
    do update set
      name = excluded.name,
      location_type = excluded.location_type,
      is_active = true,
      updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists warehouses_ensure_default_location on public.warehouses;
create trigger warehouses_ensure_default_location
after insert or update of is_active on public.warehouses
for each row execute function public.ensure_default_warehouse_location();

insert into public.warehouse_locations
  (organization_id, warehouse_id, code, name, location_type, is_active)
select warehouse.organization_id, warehouse.id, 'MAIN', 'Main storage', 'storage', true
from public.warehouses warehouse
where warehouse.is_active
  and not exists (
    select 1
    from public.warehouse_locations location
    where location.organization_id = warehouse.organization_id
      and location.warehouse_id = warehouse.id
      and location.is_active
  )
on conflict (organization_id, warehouse_id, code)
do update set
  name = excluded.name,
  location_type = excluded.location_type,
  is_active = true,
  updated_at = now();

revoke all on function public.ensure_default_warehouse_location() from public;

commit;
