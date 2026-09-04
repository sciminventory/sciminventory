"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const watchedTables = [
  "products",
  "inventory_balances",
  "inventory_movements",
  "inventory_operations",
  "warehouse_tasks",
  "procurement_records",
  "shipments",
  "suppliers",
  "warehouses",
] as const;

export function RealtimeDashboardSync({ organizationId }: { organizationId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`overview:${organizationId}`);
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 250);
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
      void supabase.removeChannel(channel);
    };
  }, [organizationId, router]);

  return <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 font-mono text-[9px] font-medium text-emerald-700"><i className="size-2 animate-pulse rounded-full bg-emerald-500" /> LIVE</span>;
}
