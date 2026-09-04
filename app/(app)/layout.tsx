import { redirect } from "next/navigation";
import { OperationsShell } from "@/components/operations/operations-shell";
import { logout } from "@/app/(auth)/actions";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { roleRequiresMfa, type OrganizationRole } from "@/lib/auth/permissions";
import { requireMfaSession } from "@/lib/auth/require-mfa";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let workspaceName = "Northstar Distribution";
  let userName = "Maria Santos";
  let userRole: OrganizationRole | "preview" = "preview";
  const preview = !hasSupabaseEnv();

  if (!preview) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    userName = String(
      user.user_metadata.full_name ?? user.email?.split("@")[0] ?? "Operator",
    );
    const { data: membership } = await supabase
      .from("organization_memberships")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (membership) {
      userRole = membership.role;
      if (roleRequiresMfa(membership.role)) await requireMfaSession(supabase);
      const { data: organization } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", membership.organization_id)
        .single();
      if (organization) workspaceName = organization.name;
    }
  }

  return (
    <OperationsShell
      workspaceName={workspaceName}
      userName={userName}
      userRole={userRole}
      preview={preview}
      logoutAction={logout}
    >
      {children}
    </OperationsShell>
  );
}
