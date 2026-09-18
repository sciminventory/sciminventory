begin;

alter table public.vendor_contacts
  add column if not exists is_active boolean not null default true;

-- Keep one active primary contact per vendor before enforcing the invariant.
with ranked_primary_contacts as (
  select id,
         row_number() over (
           partition by organization_id, supplier_id
           order by updated_at desc, created_at desc, id
         ) as position
  from public.vendor_contacts
  where is_primary and is_active
)
update public.vendor_contacts contact
set is_primary = false
from ranked_primary_contacts ranked
where contact.id = ranked.id
  and ranked.position > 1;

create unique index if not exists vendor_contacts_one_primary_idx
  on public.vendor_contacts (organization_id, supplier_id)
  where is_primary and is_active;

create index if not exists vendor_contacts_active_idx
  on public.vendor_contacts (organization_id, supplier_id, is_active, is_primary desc);

create or replace function public.manage_vendor_contact(
  target_organization_id uuid,
  target_supplier_id uuid,
  target_contact_id uuid,
  contact_full_name text,
  contact_email text,
  contact_phone text,
  contact_job_title text,
  contact_is_primary boolean,
  contact_is_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  saved_contact_id uuid;
  event_action text;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if not (
    public.has_org_role(
      target_organization_id,
      array['owner','admin','procurement_manager','buyer']::public.organization_role[]
    )
    or public.vendor_has_role(target_organization_id, target_supplier_id, array['admin'])
  ) then
    raise exception 'Vendor contact management permission required';
  end if;
  if char_length(trim(contact_full_name)) not between 2 and 160 then
    raise exception 'Contact name must be between 2 and 160 characters';
  end if;
  if nullif(trim(contact_email), '') is null then raise exception 'Contact email is required'; end if;
  if not exists (
    select 1 from public.suppliers supplier
    where supplier.organization_id = target_organization_id
      and supplier.id = target_supplier_id
  ) then raise exception 'Vendor not found'; end if;

  if contact_is_primary and contact_is_active then
    update public.vendor_contacts
    set is_primary = false
    where organization_id = target_organization_id
      and supplier_id = target_supplier_id
      and is_primary;
  end if;

  if target_contact_id is null then
    insert into public.vendor_contacts
      (organization_id, supplier_id, full_name, email, phone, job_title, is_primary, is_active)
    values
      (target_organization_id, target_supplier_id, trim(contact_full_name), lower(trim(contact_email)),
       nullif(trim(contact_phone), ''), nullif(trim(contact_job_title), ''),
       contact_is_primary, contact_is_active)
    returning id into saved_contact_id;
    event_action := 'created';
  else
    update public.vendor_contacts
    set full_name = trim(contact_full_name),
        email = lower(trim(contact_email)),
        phone = nullif(trim(contact_phone), ''),
        job_title = nullif(trim(contact_job_title), ''),
        is_primary = contact_is_primary and contact_is_active,
        is_active = contact_is_active
    where id = target_contact_id
      and organization_id = target_organization_id
      and supplier_id = target_supplier_id
    returning id into saved_contact_id;
    if saved_contact_id is null then raise exception 'Vendor contact not found'; end if;
    event_action := case when contact_is_active then 'updated' else 'archived' end;
  end if;

  if contact_is_active and not exists (
    select 1 from public.vendor_contacts
    where organization_id = target_organization_id
      and supplier_id = target_supplier_id
      and is_active and is_primary
  ) then
    update public.vendor_contacts
    set is_primary = true
    where id = (
      select id from public.vendor_contacts
      where organization_id = target_organization_id
        and supplier_id = target_supplier_id
        and is_active
      order by created_at, id
      limit 1
    );
  end if;

  insert into public.workflow_events
    (organization_id, supplier_id, entity_type, entity_id, to_status, message, actor_id)
  values
    (target_organization_id, target_supplier_id, 'vendor_contact', saved_contact_id,
     event_action, trim(contact_full_name) || ' was ' || event_action, actor_id);

  return saved_contact_id;
end;
$$;

create or replace function public.archive_vendor_contact(
  target_organization_id uuid,
  target_supplier_id uuid,
  target_contact_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  archived_name text;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if not (
    public.has_org_role(
      target_organization_id,
      array['owner','admin','procurement_manager','buyer']::public.organization_role[]
    )
    or public.vendor_has_role(target_organization_id, target_supplier_id, array['admin'])
  ) then
    raise exception 'Vendor contact management permission required';
  end if;

  update public.vendor_contacts
  set is_active = false, is_primary = false
  where id = target_contact_id
    and organization_id = target_organization_id
    and supplier_id = target_supplier_id
    and is_active
  returning full_name into archived_name;
  if archived_name is null then raise exception 'Active vendor contact not found'; end if;

  if not exists (
    select 1 from public.vendor_contacts
    where organization_id = target_organization_id
      and supplier_id = target_supplier_id
      and is_active and is_primary
  ) then
    update public.vendor_contacts
    set is_primary = true
    where id = (
      select id from public.vendor_contacts
      where organization_id = target_organization_id
        and supplier_id = target_supplier_id
        and is_active
      order by created_at, id
      limit 1
    );
  end if;

  insert into public.workflow_events
    (organization_id, supplier_id, entity_type, entity_id, to_status, message, actor_id)
  values
    (target_organization_id, target_supplier_id, 'vendor_contact', target_contact_id,
     'archived', archived_name || ' was archived', actor_id);
end;
$$;

create or replace function public.compute_vendor_performance_snapshot(
  target_organization_id uuid,
  target_supplier_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  range_start date := current_date - 89;
  range_end date := current_date;
  order_count_value integer := 0;
  ordered_quantity numeric := 0;
  received_quantity numeric := 0;
  delivered_shipments integer := 0;
  on_time_shipments integer := 0;
  accepted_quantity numeric := 0;
  rejected_quantity numeric := 0;
  match_count integer := 0;
  accurate_match_count integer := 0;
  response_hours numeric := 0;
  on_time_rate numeric := 0;
  fulfillment_rate_value numeric := 0;
  quality_score_value numeric := 0;
  accuracy_score_value numeric := 0;
  response_score numeric := 0;
  overall_score_value numeric := 0;
begin
  if not exists (
    select 1 from public.suppliers supplier
    where supplier.organization_id = target_organization_id
      and supplier.id = target_supplier_id
  ) then return; end if;

  select count(distinct purchase_order.id),
         coalesce(sum(line.quantity), 0),
         coalesce(sum(least(line.received_quantity, line.quantity)), 0)
  into order_count_value, ordered_quantity, received_quantity
  from public.procurement_records purchase_order
  left join public.procurement_record_lines line
    on line.organization_id = purchase_order.organization_id
    and line.procurement_record_id = purchase_order.id
  where purchase_order.organization_id = target_organization_id
    and purchase_order.supplier_id = target_supplier_id
    and purchase_order.record_type = 'purchase_order'
    and purchase_order.created_at::date between range_start and range_end;

  select count(*) filter (where shipment.actual_arrival_at is not null),
         count(*) filter (
           where shipment.actual_arrival_at is not null
             and (coalesce(shipment.expected_arrival_at, shipment.due_at) is null
               or shipment.actual_arrival_at <= coalesce(shipment.expected_arrival_at, shipment.due_at))
         )
  into delivered_shipments, on_time_shipments
  from public.shipments shipment
  where shipment.organization_id = target_organization_id
    and shipment.supplier_id = target_supplier_id
    and shipment.created_at::date between range_start and range_end;

  select coalesce(sum(receipt_line.accepted_quantity), 0),
         coalesce(sum(receipt_line.rejected_quantity), 0)
  into accepted_quantity, rejected_quantity
  from public.goods_receipt_lines receipt_line
  join public.goods_receipts receipt
    on receipt.id = receipt_line.goods_receipt_id
    and receipt.organization_id = receipt_line.organization_id
  join public.shipments shipment
    on shipment.id = receipt.shipment_id
    and shipment.organization_id = receipt.organization_id
  where shipment.organization_id = target_organization_id
    and shipment.supplier_id = target_supplier_id
    and receipt.received_at::date between range_start and range_end;

  select count(*), count(*) filter (where match_result.result = 'matched')
  into match_count, accurate_match_count
  from public.invoice_matches match_result
  join public.vendor_invoices invoice
    on invoice.id = match_result.invoice_id
    and invoice.organization_id = match_result.organization_id
  where invoice.organization_id = target_organization_id
    and invoice.supplier_id = target_supplier_id
    and match_result.matched_at::date between range_start and range_end;

  select coalesce(avg(extract(epoch from (
    acknowledgement.responded_at - coalesce(issue_event.occurred_at, purchase_order.created_at)
  )) / 3600), 0)
  into response_hours
  from public.purchase_order_acknowledgements acknowledgement
  join public.procurement_records purchase_order
    on purchase_order.id = acknowledgement.purchase_order_id
    and purchase_order.organization_id = acknowledgement.organization_id
  left join lateral (
    select event.occurred_at
    from public.workflow_events event
    where event.organization_id = acknowledgement.organization_id
      and event.entity_type = 'purchase_order'
      and event.entity_id = acknowledgement.purchase_order_id
      and event.to_status = 'sent'
      and event.occurred_at <= acknowledgement.responded_at
    order by event.occurred_at desc
    limit 1
  ) issue_event on true
  where acknowledgement.organization_id = target_organization_id
    and acknowledgement.supplier_id = target_supplier_id
    and acknowledgement.responded_at::date between range_start and range_end;

  on_time_rate := case when delivered_shipments > 0 then on_time_shipments::numeric / delivered_shipments * 100 else 0 end;
  fulfillment_rate_value := case when ordered_quantity > 0 then received_quantity / ordered_quantity * 100 else 0 end;
  quality_score_value := case when accepted_quantity + rejected_quantity > 0 then accepted_quantity / (accepted_quantity + rejected_quantity) * 100 else 0 end;
  accuracy_score_value := case when match_count > 0 then accurate_match_count::numeric / match_count * 100 else 0 end;
  response_score := greatest(0, 100 - least(response_hours, 48) / 48 * 100);
  overall_score_value := on_time_rate * .30
    + fulfillment_rate_value * .30
    + quality_score_value * .20
    + accuracy_score_value * .15
    + response_score * .05;

  insert into public.vendor_performance_snapshots
    (organization_id, supplier_id, period_start, period_end, on_time_delivery_rate,
     fulfillment_rate, quality_score, accuracy_score, response_time_hours,
     overall_score, order_count, calculated_by, calculated_at)
  values
    (target_organization_id, target_supplier_id, range_start, range_end,
     round(on_time_rate, 2), round(fulfillment_rate_value, 2), round(quality_score_value, 2),
     round(accuracy_score_value, 2), round(response_hours, 2), round(overall_score_value, 2),
     order_count_value, auth.uid(), now())
  on conflict (organization_id, supplier_id, period_start, period_end)
  do update set
    on_time_delivery_rate = excluded.on_time_delivery_rate,
    fulfillment_rate = excluded.fulfillment_rate,
    quality_score = excluded.quality_score,
    accuracy_score = excluded.accuracy_score,
    response_time_hours = excluded.response_time_hours,
    overall_score = excluded.overall_score,
    order_count = excluded.order_count,
    calculated_by = excluded.calculated_by,
    calculated_at = now();
end;
$$;

create or replace function public.refresh_vendor_performance(
  target_organization_id uuid,
  target_supplier_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.has_org_role(
    target_organization_id,
    array['owner','admin','procurement_manager','buyer']::public.organization_role[]
  ) then raise exception 'Vendor performance permission required'; end if;
  perform public.compute_vendor_performance_snapshot(target_organization_id, target_supplier_id);
end;
$$;

create or replace function public.refresh_vendor_performance_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  target_organization_id uuid := (row_data ->> 'organization_id')::uuid;
  target_supplier_id uuid := nullif(row_data ->> 'supplier_id', '')::uuid;
begin
  if tg_table_name = 'procurement_record_lines' then
    select purchase_order.supplier_id
    into target_supplier_id
    from public.procurement_records purchase_order
    where purchase_order.organization_id = target_organization_id
      and purchase_order.id = (row_data ->> 'procurement_record_id')::uuid;
  elsif tg_table_name = 'goods_receipt_lines' then
    select shipment.supplier_id
    into target_supplier_id
    from public.goods_receipts receipt
    join public.shipments shipment
      on shipment.organization_id = receipt.organization_id
      and shipment.id = receipt.shipment_id
    where receipt.organization_id = target_organization_id
      and receipt.id = (row_data ->> 'goods_receipt_id')::uuid;
  elsif tg_table_name = 'invoice_matches' then
    select invoice.supplier_id
    into target_supplier_id
    from public.vendor_invoices invoice
    where invoice.organization_id = target_organization_id
      and invoice.id = (row_data ->> 'invoice_id')::uuid;
  end if;

  if target_supplier_id is not null then
    perform public.compute_vendor_performance_snapshot(target_organization_id, target_supplier_id);
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'procurement_records', 'procurement_record_lines',
    'purchase_order_acknowledgements', 'shipments', 'goods_receipt_lines',
    'invoice_matches', 'vendor_return_requests', 'vendor_invoices'
  ] loop
    execute format('drop trigger if exists %I on public.%I', target_table || '_refresh_vendor_performance', target_table);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.refresh_vendor_performance_after_change()',
      target_table || '_refresh_vendor_performance', target_table
    );
  end loop;
end;
$$;

create or replace view public.vendor_activity_history
with (security_invoker = true)
as
select 'workflow:' || event.id::text as event_id,
       event.organization_id,
       event.supplier_id,
       event.entity_type as kind,
       initcap(replace(event.entity_type, '_', ' ')) || ' status changed' as title,
       event.message as detail,
       event.to_status as status,
       event.entity_id::text as reference,
       null::numeric as amount,
       event.occurred_at
from public.workflow_events event
where event.supplier_id is not null
union all
select 'purchase_order:' || purchase_order.id::text,
       purchase_order.organization_id,
       purchase_order.supplier_id,
       'purchase_order',
       'Purchase order ' || purchase_order.reference,
       purchase_order.title,
       purchase_order.status,
       purchase_order.reference,
       purchase_order.amount,
       purchase_order.created_at
from public.procurement_records purchase_order
where purchase_order.record_type = 'purchase_order' and purchase_order.supplier_id is not null
union all
select 'acknowledgement:' || acknowledgement.id::text,
       acknowledgement.organization_id,
       acknowledgement.supplier_id,
       'acknowledgement',
       'Purchase order response',
       acknowledgement.message,
       acknowledgement.response,
       acknowledgement.purchase_order_id::text,
       acknowledgement.proposed_amount,
       acknowledgement.responded_at
from public.purchase_order_acknowledgements acknowledgement
union all
select 'shipment_event:' || shipment_event.id::text,
       shipment_event.organization_id,
       shipment.supplier_id,
       'shipment',
       'Shipment ' || shipment.reference,
       coalesce(shipment_event.message, shipment_event.location),
       shipment_event.status,
       shipment.reference,
       null::numeric,
       shipment_event.occurred_at
from public.shipment_events shipment_event
join public.shipments shipment
  on shipment.id = shipment_event.shipment_id
  and shipment.organization_id = shipment_event.organization_id
where shipment.supplier_id is not null
union all
select 'receipt:' || receipt.id::text,
       receipt.organization_id,
       shipment.supplier_id,
       'goods_receipt',
       'Goods receipt ' || receipt.reference,
       receipt.notes,
       receipt.status,
       receipt.reference,
       null::numeric,
       receipt.received_at
from public.goods_receipts receipt
join public.shipments shipment
  on shipment.id = receipt.shipment_id
  and shipment.organization_id = receipt.organization_id
where shipment.supplier_id is not null
union all
select 'invoice:' || invoice.id::text,
       invoice.organization_id,
       invoice.supplier_id,
       'invoice',
       'Invoice ' || invoice.invoice_number,
       invoice.mismatch_reason,
       invoice.status,
       invoice.invoice_number,
       invoice.total_amount,
       invoice.submitted_at
from public.vendor_invoices invoice
union all
select 'payment:' || payment.id::text,
       payment.organization_id,
       payment.supplier_id,
       'payment',
       'Payment ' || payment.reference,
       payment.payment_method,
       payment.status,
       payment.reference,
       payment.amount,
       coalesce(payment.paid_at, payment.scheduled_at, payment.created_at)
from public.payment_records payment
union all
select 'review:' || review.id::text,
       review.organization_id,
       review.supplier_id,
       'review',
       'Vendor review',
       review.summary,
       review.action,
       review.id::text,
       null::numeric,
       review.created_at
from public.vendor_reviews review
union all
select 'improvement:' || plan.id::text,
       plan.organization_id,
       plan.supplier_id,
       'improvement_plan',
       plan.title,
       plan.objectives,
       plan.status,
       plan.id::text,
       null::numeric,
       plan.created_at
from public.vendor_improvement_plans plan;

revoke all on function public.manage_vendor_contact(uuid, uuid, uuid, text, text, text, text, boolean, boolean) from public;
revoke all on function public.archive_vendor_contact(uuid, uuid, uuid) from public;
revoke all on function public.compute_vendor_performance_snapshot(uuid, uuid) from public;
revoke all on function public.refresh_vendor_performance(uuid, uuid) from public;
revoke all on function public.refresh_vendor_performance_after_change() from public;
grant execute on function public.manage_vendor_contact(uuid, uuid, uuid, text, text, text, text, boolean, boolean) to authenticated;
grant execute on function public.archive_vendor_contact(uuid, uuid, uuid) to authenticated;
grant execute on function public.refresh_vendor_performance(uuid, uuid) to authenticated;
grant select on public.vendor_activity_history to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'vendor_contacts',
    'vendor_reviews',
    'vendor_improvement_plans',
    'workflow_events'
  ] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        table_name
      );
    end if;
  end loop;
end;
$$;

commit;
