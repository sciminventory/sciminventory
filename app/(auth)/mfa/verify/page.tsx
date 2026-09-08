import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthVisual } from "@/components/auth/auth-card";
import { MfaChallengePanel } from "@/components/auth/mfa-panels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Verify identity" };

export default async function MfaVerifyPage() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: factors }, { data: assurance }, { data: membership }] = await Promise.all([
    client.auth.mfa.listFactors(),
    client.auth.mfa.getAuthenticatorAssuranceLevel(),
    client.from("organization_memberships").select("id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle(),
  ]);
  const vendorAccess = membership ? null : (await client.from("vendor_users").select("id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle()).data;
  const nextPath = vendorAccess ? "/vendor" : "/dashboard";
  if (assurance?.currentLevel === "aal2") redirect(nextPath);
  const factor = factors?.totp.find((item) => item.status === "verified");
  if (!factor) redirect("/mfa/setup");
  return <main className="grid min-h-dvh bg-white lg:grid-cols-[1.15fr_.85fr]"><AuthVisual showLogo={false} /><section className="flex items-center justify-center p-4 sm:p-10"><div className="w-full max-w-md"><MfaChallengePanel factorId={factor.id} nextPath={nextPath} /></div></section></main>;
}
