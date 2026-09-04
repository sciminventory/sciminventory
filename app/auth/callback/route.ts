import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: membership } = await supabase
          .from("organization_memberships")
          .select("id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        const pendingName = user.user_metadata.pending_organization_name;
        if (
          !membership &&
          typeof pendingName === "string" &&
          pendingName.trim().length >= 2
        ) {
          const base = pendingName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
          const { error: onboardingError } = await supabase.rpc(
            "create_organization",
            {
              organization_name: pendingName,
              organization_slug: `${base}-${crypto.randomUUID().slice(0, 6)}`,
            },
          );
          if (onboardingError) {
            return NextResponse.redirect(
              new URL(
                `/signup?message=${encodeURIComponent(onboardingError.message)}`,
                requestUrl.origin,
              ),
            );
          }
        }
        if (membership) {
          await supabase.rpc("activate_my_invited_memberships");
        }
      }
      return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
    }
  }

  return NextResponse.redirect(
    new URL(
      "/login?message=Unable%20to%20complete%20sign%20in.",
      requestUrl.origin,
    ),
  );
}
