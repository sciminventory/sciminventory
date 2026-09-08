begin;

-- Procurement values in this workspace are Philippine pesos. Update records
-- created under the former USD default without changing their numeric amount.
alter table public.procurement_records
  alter column currency set default 'PHP';

update public.procurement_records
set currency = 'PHP'
where currency = 'USD';

commit;
