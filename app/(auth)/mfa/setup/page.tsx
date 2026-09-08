import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthVisual } from "@/components/auth/auth-card";
import { MfaSetupPanel } from "@/components/auth/mfa-panels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Set up multi-factor authentication" };

export default async function MfaSetupPage() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await client.auth.mfa.listFactors();
  if (data?.totp.some((factor) => factor.status === "verified")) redirect("/mfa/verify");
  const { data: membership } = await client.from("organization_memberships").select("id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  const vendorAccess = membership ? null : (await client.from("vendor_users").select("id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle()).data;
  return <main className="grid min-h-dvh bg-white lg:grid-cols-[1.05fr_.95fr]"><AuthVisual showLogo={false} /><section className="flex items-center justify-center p-3 min-[380px]:p-5 sm:p-10"><div className="w-full max-w-xl"><p className="mb-5 text-center text-[10px] font-medium text-blue-700">Required before accessing your workspace</p><MfaSetupPanel required nextPath={vendorAccess ? "/vendor" : "/dashboard"} /></div></section></main>;
}
