import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicVendorApplicationForm } from "@/components/vendor/public-vendor-application-form";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Become a vendor" };

export default async function VendorApplicationPage({ params }: { params: Promise<{ organizationSlug: string }> }) {
  if (!hasSupabaseAdminEnv()) return <main className="grid min-h-screen place-items-center p-6"><p>Vendor applications are temporarily unavailable.</p></main>;
  const { organizationSlug } = await params;
  const admin = createAdminClient();
  const organization = await admin.from("organizations").select("id,name,slug").eq("slug", organizationSlug).maybeSingle();
  if (!organization.data) notFound();
  return <main className="min-h-screen bg-[#f4f7fb] px-4 pb-20 pt-28 sm:px-6 sm:pt-36"><div className="mx-auto max-w-4xl"><div className="mb-8 text-center"><p className="font-mono text-xs uppercase tracking-[.12em] text-blue-700">Secure vendor onboarding</p><h1 className="mt-4 text-4xl font-bold tracking-[-.055em] sm:text-5xl">Partner with {organization.data.name}</h1><p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted">Submit standardized company, capability, and compliance information for procurement review.</p></div><PublicVendorApplicationForm organizationId={organization.data.id} organizationName={organization.data.name} /></div></main>;
}
