begin;

create table public.vendor_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null,
  subject text not null check (char_length(trim(subject)) between 2 and 160),
  context_type text not null default 'general'
    check (context_type in ('general', 'purchase_order', 'shipment', 'invoice')),
  purchase_order_id uuid,
  shipment_id uuid,
  invoice_id uuid,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_by uuid not null references auth.users(id) on delete restrict,
  last_message_at timestamptz not null default now(),
  internal_last_read_at timestamptz,
  vendor_last_read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, supplier_id)
    references public.suppliers(organization_id, id) on delete cascade,
  foreign key (organization_id, purchase_order_id)
    references public.procurement_records(organization_id, id) on delete cascade,
  foreign key (organization_id, shipment_id)
    references public.shipments(organization_id, id) on delete cascade,
  foreign key (organization_id, invoice_id)
    references public.vendor_invoices(organization_id, id) on delete cascade,
  check (
    (context_type = 'general' and purchase_order_id is null and shipment_id is null and invoice_id is null)
    or (context_type = 'purchase_order' and purchase_order_id is not null and shipment_id is null and invoice_id is null)
    or (context_type = 'shipment' and purchase_order_id is null and shipment_id is not null and invoice_id is null)
    or (context_type = 'invoice' and purchase_order_id is null and shipment_id is null and invoice_id is not null)
  ),
  unique (organization_id, supplier_id, id)
);

create table public.vendor_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null,
  conversation_id uuid not null,
  sender_id uuid not null references auth.users(id) on delete restrict,
  sender_party text not null check (sender_party in ('internal', 'vendor')),
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  foreign key (organization_id, supplier_id, conversation_id)
    references public.vendor_conversations(organization_id, supplier_id, id) on delete cascade
);

create index vendor_conversations_timeline_idx
  on public.vendor_conversations (organization_id, supplier_id, last_message_at desc);
create index vendor_messages_thread_idx
  on public.vendor_messages (conversation_id, created_at);

create trigger vendor_conversations_set_updated_at
before update on public.vendor_conversations
for each row execute function public.set_updated_at();

create function public.can_access_vendor_communication(
  target_organization_id uuid,
  target_supplier_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.has_org_role(
      target_organization_id,
      array['owner','admin','procurement_manager','buyer','warehouse_manager']::public.organization_role[]
    )
    or public.is_active_vendor_user(target_organization_id, target_supplier_id);
$$;

create function public.create_vendor_conversation(
  target_organization_id uuid,
  target_supplier_id uuid,
  conversation_subject text,
  conversation_context_type text,
  target_context_id uuid,
  initial_message text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_party text;
  conversation_id uuid;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if not public.can_access_vendor_communication(target_organization_id, target_supplier_id) then
    raise exception 'Vendor communication permission required';
  end if;
  if char_length(trim(conversation_subject)) not between 2 and 160 then
    raise exception 'Subject must be between 2 and 160 characters';
  end if;
  if char_length(trim(initial_message)) not between 1 and 4000 then
    raise exception 'Message must be between 1 and 4000 characters';
  end if;
  if conversation_context_type not in ('general', 'purchase_order', 'shipment', 'invoice') then
    raise exception 'Invalid conversation context';
  end if;

  actor_party := case
    when public.has_org_role(
      target_organization_id,
      array['owner','admin','procurement_manager','buyer','warehouse_manager']::public.organization_role[]
    ) then 'internal'
    else 'vendor'
  end;

  if conversation_context_type = 'general' and target_context_id is not null then
    raise exception 'General conversations cannot have a transaction';
  elsif conversation_context_type = 'purchase_order' and not exists (
    select 1 from public.procurement_records record
    where record.organization_id = target_organization_id
      and record.id = target_context_id
      and record.supplier_id = target_supplier_id
      and record.record_type = 'purchase_order'
  ) then raise exception 'Purchase order not found for this vendor';
  elsif conversation_context_type = 'shipment' and not exists (
    select 1 from public.shipments shipment
    where shipment.organization_id = target_organization_id
      and shipment.id = target_context_id
      and shipment.supplier_id = target_supplier_id
  ) then raise exception 'Shipment not found for this vendor';
  elsif conversation_context_type = 'invoice' and not exists (
    select 1 from public.vendor_invoices invoice
    where invoice.organization_id = target_organization_id
      and invoice.id = target_context_id
      and invoice.supplier_id = target_supplier_id
  ) then raise exception 'Invoice not found for this vendor';
  end if;

  insert into public.vendor_conversations
    (organization_id, supplier_id, subject, context_type, purchase_order_id,
     shipment_id, invoice_id, created_by, internal_last_read_at, vendor_last_read_at)
  values
    (target_organization_id, target_supplier_id, trim(conversation_subject),
     conversation_context_type,
     case when conversation_context_type = 'purchase_order' then target_context_id end,
     case when conversation_context_type = 'shipment' then target_context_id end,
     case when conversation_context_type = 'invoice' then target_context_id end,
     actor_id,
     case when actor_party = 'internal' then now() end,
     case when actor_party = 'vendor' then now() end)
  returning id into conversation_id;

  insert into public.vendor_messages
    (organization_id, supplier_id, conversation_id, sender_id, sender_party, body)
  values
    (target_organization_id, target_supplier_id, conversation_id, actor_id,
     actor_party, trim(initial_message));

  insert into public.notifications
    (organization_id, supplier_id, audience, title, message, href)
  values
    (target_organization_id, target_supplier_id,
     case when actor_party = 'internal' then 'vendor' else 'internal' end,
     'New vendor message', trim(conversation_subject),
     case when actor_party = 'internal'
       then '/vendor/messages?conversation=' || conversation_id::text
       else '/dashboard/vendors?vendor=' || target_supplier_id::text || '&tab=messages&conversation=' || conversation_id::text
     end);

  return conversation_id;
end;
$$;

create function public.send_vendor_message(
  target_conversation_id uuid,
  message_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  conversation_record public.vendor_conversations%rowtype;
  actor_party text;
  message_id uuid;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if char_length(trim(message_body)) not between 1 and 4000 then
    raise exception 'Message must be between 1 and 4000 characters';
  end if;

  select * into conversation_record
  from public.vendor_conversations conversation
  where conversation.id = target_conversation_id
  for update;
  if not found then raise exception 'Conversation not found'; end if;
  if conversation_record.status <> 'open' then raise exception 'Conversation is closed'; end if;
  if not public.can_access_vendor_communication(
    conversation_record.organization_id,
    conversation_record.supplier_id
  ) then raise exception 'Vendor communication permission required'; end if;

  actor_party := case
    when public.has_org_role(
      conversation_record.organization_id,
      array['owner','admin','procurement_manager','buyer','warehouse_manager']::public.organization_role[]
    ) then 'internal'
    else 'vendor'
  end;

  insert into public.vendor_messages
    (organization_id, supplier_id, conversation_id, sender_id, sender_party, body)
  values
    (conversation_record.organization_id, conversation_record.supplier_id,
     conversation_record.id, actor_id, actor_party, trim(message_body))
  returning id into message_id;

  update public.vendor_conversations
  set last_message_at = now(),
      internal_last_read_at = case when actor_party = 'internal' then now() else internal_last_read_at end,
      vendor_last_read_at = case when actor_party = 'vendor' then now() else vendor_last_read_at end
  where id = conversation_record.id;

  insert into public.notifications
    (organization_id, supplier_id, audience, title, message, href)
  values
    (conversation_record.organization_id, conversation_record.supplier_id,
     case when actor_party = 'internal' then 'vendor' else 'internal' end,
     'New reply: ' || conversation_record.subject,
     left(trim(message_body), 240),
     case when actor_party = 'internal'
       then '/vendor/messages?conversation=' || conversation_record.id::text
       else '/dashboard/vendors?vendor=' || conversation_record.supplier_id::text || '&tab=messages&conversation=' || conversation_record.id::text
     end);

  return message_id;
end;
$$;

create function public.mark_vendor_conversation_read(target_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation_record public.vendor_conversations%rowtype;
begin
  select * into conversation_record
  from public.vendor_conversations conversation
  where conversation.id = target_conversation_id;
  if not found or not public.can_access_vendor_communication(
    conversation_record.organization_id,
    conversation_record.supplier_id
  ) then raise exception 'Conversation not found'; end if;

  update public.vendor_conversations
  set internal_last_read_at = case
        when public.is_active_member(conversation_record.organization_id) then now()
        else internal_last_read_at
      end,
      vendor_last_read_at = case
        when public.is_active_vendor_user(conversation_record.organization_id, conversation_record.supplier_id) then now()
        else vendor_last_read_at
      end
  where id = target_conversation_id;
end;
$$;

create function public.notify_delivered_shipment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'delivered' and old.status is distinct from new.status and new.supplier_id is not null then
    insert into public.notifications
      (organization_id, supplier_id, audience, title, message, href)
    values
      (new.organization_id, new.supplier_id, 'vendor',
       'Shipment delivered', 'Shipment ' || new.reference || ' was received and marked delivered.',
       '/vendor/shipments'),
      (new.organization_id, new.supplier_id, 'internal',
       'Shipment delivered', 'Shipment ' || new.reference || ' was received and marked delivered.',
       '/dashboard/vendors?vendor=' || new.supplier_id::text || '&tab=logistics');
  end if;
  return new;
end;
$$;

create trigger shipments_notify_delivered
after update of status on public.shipments
for each row execute function public.notify_delivered_shipment();

alter table public.vendor_conversations enable row level security;
alter table public.vendor_messages enable row level security;
alter table public.vendor_conversations force row level security;
alter table public.vendor_messages force row level security;

create policy "vendor_conversations_select_scope" on public.vendor_conversations
for select to authenticated using (
  public.can_access_vendor_communication(organization_id, supplier_id)
);
create policy "vendor_messages_select_scope" on public.vendor_messages
for select to authenticated using (
  public.can_access_vendor_communication(organization_id, supplier_id)
);

grant select on public.vendor_conversations, public.vendor_messages to authenticated;

revoke all on function public.can_access_vendor_communication(uuid, uuid) from public;
revoke all on function public.create_vendor_conversation(uuid, uuid, text, text, uuid, text) from public;
revoke all on function public.send_vendor_message(uuid, text) from public;
revoke all on function public.mark_vendor_conversation_read(uuid) from public;
revoke all on function public.notify_delivered_shipment() from public;
grant execute on function public.can_access_vendor_communication(uuid, uuid) to authenticated;
grant execute on function public.create_vendor_conversation(uuid, uuid, text, text, uuid, text) to authenticated;
grant execute on function public.send_vendor_message(uuid, text) to authenticated;
grant execute on function public.mark_vendor_conversation_read(uuid) to authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array['vendor_conversations', 'vendor_messages'] loop
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
