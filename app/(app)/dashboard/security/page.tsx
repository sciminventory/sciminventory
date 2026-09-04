import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MfaSetupPanel, type MfaFactor } from "@/components/auth/mfa-panels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Account security" };

export default async function SecurityPage() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await client.auth.mfa.listFactors();
  const factors: MfaFactor[] = (data?.totp ?? []).filter((factor) => factor.status === "verified").map((factor) => ({ id: factor.id, friendly_name: factor.friendly_name, status: "verified", created_at: factor.created_at }));
  return <div className="w-full p-4 sm:p-6 lg:p-8 xl:p-10"><header><p className="eyebrow text-muted">Account protection</p><h1 className="mt-2 text-3xl font-bold tracking-[-.05em]">Security settings</h1><p className="mt-3 max-w-xl text-sm leading-7 text-muted">Manage the authenticator factor used to protect privileged workspace access.</p></header><div className="mt-7 max-w-2xl"><MfaSetupPanel verifiedFactors={factors} /></div></div>;
}
