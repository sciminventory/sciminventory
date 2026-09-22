import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HistoryReport } from "@/components/operations/history-report";
import { historyModuleFor, parseHistoryModule, type HistoryEvent } from "@/lib/operations/history";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "History & Reports" };

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ module?: string }> }) {
  const selected = parseHistoryModule((await searchParams).module);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership } = await supabase.from("organization_memberships").select("organization_id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!membership) redirect("/dashboard");
  const { data } = await supabase.from("audit_events").select("id, action, entity_type, entity_id, occurred_at").eq("organization_id", membership.organization_id).order("occurred_at", { ascending: false }).limit(500);
  const events: HistoryEvent[] = (data ?? []).flatMap((event) => {
    const eventModule = historyModuleFor(event.entity_type, event.action);
    return eventModule === selected ? [{ id: event.id, module: eventModule, action: event.action, entityType: event.entity_type, entityId: event.entity_id, occurredAt: event.occurred_at }] : [];
  });
  return <HistoryReport activeModule={selected} events={events} />;
}
