begin;

alter table public.procurement_records
  add column if not exists order_date date;

update public.procurement_records
set order_date = created_at::date
where order_date is null;

alter table public.procurement_records
  alter column order_date set default current_date,
  alter column order_date set not null;

commit;
