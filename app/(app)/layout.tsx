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
  let organizationId: string | null = null;
  let notifications: Array<{ id: string; title: string; message: string; href: string | null; readAt: string | null; createdAt: string }> = [];
  let unreadNotifications = 0;
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
      organizationId = membership.organization_id;
      userRole = membership.role;
      if (roleRequiresMfa(membership.role)) await requireMfaSession(supabase);
      const { data: organization } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", membership.organization_id)
        .single();
      if (organization) workspaceName = organization.name;
      const [{ data: notificationRows }, { count: unreadCount }] = await Promise.all([
        supabase
          .from("notifications")
          .select("id, title, message, href, read_at, created_at")
          .eq("organization_id", membership.organization_id)
          .eq("audience", "internal")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", membership.organization_id)
          .eq("audience", "internal")
          .is("read_at", null),
      ]);
      unreadNotifications = unreadCount ?? 0;
      notifications = (notificationRows ?? []).map((notice) => ({
        id: notice.id,
        title: notice.title,
        message: notice.message,
        href: notice.href,
        readAt: notice.read_at,
        createdAt: notice.created_at,
      }));
    }
  }

  return (
    <OperationsShell
      workspaceName={workspaceName}
      userName={userName}
      userRole={userRole}
      preview={preview}
      organizationId={organizationId}
      notifications={notifications}
      unreadNotifications={unreadNotifications}
      logoutAction={logout}
    >
      {children}
    </OperationsShell>
  );
}
