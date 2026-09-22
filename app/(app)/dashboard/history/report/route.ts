import { NextRequest } from "next/server";
import { createHistoryPdf } from "@/lib/reports/simple-pdf";
import { historyLabels, historyModuleFor, humanizeHistoryValue, parseHistoryModule } from "@/lib/operations/history";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const selected = parseHistoryModule(request.nextUrl.searchParams.get("module"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Authentication required", { status: 401 });
  const { data: membership } = await supabase.from("organization_memberships").select("organization_id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!membership) return new Response("Workspace access required", { status: 403 });
  const [{ data: organization }, { data: rows }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", membership.organization_id).single(),
    supabase.from("audit_events").select("action, entity_type, entity_id, occurred_at").eq("organization_id", membership.organization_id).order("occurred_at", { ascending: false }).limit(500),
  ]);
  const lines = (rows ?? []).filter((row) => historyModuleFor(row.entity_type, row.action) === selected).map((row) => ({
    primary: `${new Date(row.occurred_at).toLocaleString("en-PH")}  |  ${humanizeHistoryValue(row.action)}`,
    secondary: `${humanizeHistoryValue(row.entity_type)}  |  ${row.entity_id ?? "No record ID"}`,
  }));
  const pdf = createHistoryPdf(`${historyLabels[selected]} History Report`, organization?.name ?? "Organization", lines);
  return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${selected}-history.pdf"`, "Cache-Control": "private, no-store" } });
}
