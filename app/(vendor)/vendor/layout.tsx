import { redirect } from "next/navigation";
import { logout } from "@/app/(auth)/actions";
import { VendorPortalShell } from "@/components/vendor/vendor-portal-shell";
import { VendorRealtimeSync } from "@/components/vendor/vendor-realtime-sync";
import { requireMfaSession } from "@/lib/auth/require-mfa";
import { createClient } from "@/lib/supabase/server";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const access = await supabase.from("vendor_users").select("organization_id,supplier_id,status").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!access.data) redirect("/dashboard");
  await requireMfaSession(supabase);
  const [vendor, notifications] = await Promise.all([
    supabase.from("suppliers").select("name").eq("organization_id", access.data.organization_id).eq("id", access.data.supplier_id).single(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("organization_id", access.data.organization_id).eq("supplier_id", access.data.supplier_id).eq("audience", "vendor").is("read_at", null),
  ]);
  return <VendorPortalShell vendorName={vendor.data?.name ?? "Vendor workspace"} userName={String(user.user_metadata.full_name ?? user.email?.split("@")[0] ?? "Vendor user")} unread={notifications.count ?? 0} logoutAction={logout}><VendorRealtimeSync organizationId={access.data.organization_id} />{children}</VendorPortalShell>;
}
