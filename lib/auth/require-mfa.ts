import "server-only";

import { redirect } from "next/navigation";
import type { createClient } from "@/lib/supabase/server";

type AuthenticatedClient = Awaited<ReturnType<typeof createClient>>;

export async function requireMfaSession(client: AuthenticatedClient) {
  const [{ data: factors }, { data: assurance }] = await Promise.all([
    client.auth.mfa.listFactors(),
    client.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  const hasVerifiedFactor = factors?.totp.some((factor) => factor.status === "verified") ?? false;
  if (!hasVerifiedFactor) redirect("/mfa/setup");
  if (assurance?.currentLevel !== "aal2") redirect("/mfa/verify");
}
