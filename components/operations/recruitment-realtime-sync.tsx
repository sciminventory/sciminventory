"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const watchedTables = [
  "job_openings",
  "applicants",
  "job_applications",
  "screening_runs",
  "screening_scores",
] as const;

export function RecruitmentRealtimeSync({ organizationId }: { organizationId: string }) {
  const router = useRouter();

  useEffect(() => {
    const client = createClient();
    const channel = client.channel(`recruitment:${organizationId}`);
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
      void client.removeChannel(channel);
    };
  }, [organizationId, router]);

  return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 font-mono text-xs font-medium text-emerald-700"><i className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> LIVE</span>;
}
