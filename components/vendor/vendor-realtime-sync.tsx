"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const watchedTables = [
  "suppliers",
  "vendor_users",
  "vendor_documents",
  "vendor_catalog_items",
  "procurement_records",
  "procurement_record_lines",
  "purchase_order_acknowledgements",
  "shipments",
  "shipment_lines",
  "shipment_events",
  "goods_receipts",
  "vendor_invoices",
  "payment_records",
  "vendor_performance_snapshots",
  "notifications",
] as const;

export function VendorRealtimeSync({ organizationId, badge = false }: { organizationId: string; badge?: boolean }) {
  const router = useRouter();

  useEffect(() => {
    const client = createClient();
    const channel = client.channel(`vendors:${organizationId}:${crypto.randomUUID()}`);
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 300);
    };

    for (const table of watchedTables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `organization_id=eq.${organizationId}` },
        refresh,
      );
    }
    channel.subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void client.removeChannel(channel);
    };
  }, [organizationId, router]);

  if (!badge) return null;
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 font-mono text-xs font-medium text-emerald-700"><i className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> LIVE</span>;
}
