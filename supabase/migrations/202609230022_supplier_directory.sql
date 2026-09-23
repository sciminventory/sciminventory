begin;

alter table public.suppliers
  add column if not exists contact_person text,
  add column if not exists rating numeric(3, 2) not null default 0
    check (rating between 0 and 5);

create index if not exists suppliers_directory_idx
  on public.suppliers (organization_id, status, name);

commit;
