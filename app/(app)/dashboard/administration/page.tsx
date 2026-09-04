import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  AdminConsole,
  type AdminAssignment,
  type AdminAuditEvent,
  type AdminMember,
  type AdminWarehouse,
} from "@/components/operations/admin-console";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseAdminEnv } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Administration" };

export default async function AdministrationPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { success, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("id, organization_id, role, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!membership) {
    redirect(
      "/login?message=Your%20account%20does%20not%20have%20an%20active%20organization%20membership.",
    );
  }

  const [
    organizationResult,
    membersResult,
    warehousesResult,
    assignmentsResult,
    auditResult,
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("id", membership.organization_id)
      .single(),
    supabase
      .from("organization_memberships")
      .select("id, user_id, role, status, invited_at, created_at")
      .eq("organization_id", membership.organization_id)
      .order("created_at", { ascending: true }),
    supabase
      .from("warehouses")
      .select("id, code, name, city, country_code, is_active")
      .eq("organization_id", membership.organization_id)
      .order("code"),
    supabase
      .from("warehouse_assignments")
      .select("id, warehouse_id, membership_id")
      .eq("organization_id", membership.organization_id),
    supabase
      .from("audit_events")
      .select("id, actor_id, action, entity_type, metadata, occurred_at")
      .eq("organization_id", membership.organization_id)
      .order("occurred_at", { ascending: false })
      .limit(30),
  ]);

  if (organizationResult.error || !organizationResult.data) {
    redirect("/dashboard");
  }

  const membershipRows = membersResult.data ?? [];
  const userIds = membershipRows.map((item) => item.user_id);
  const profilesResult = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds)
    : { data: [], error: null };
  const profileById = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile]),
  );

  const setupError =
    membersResult.error || profilesResult.error
      ? "Workspace administration requires a database update. Ask a system administrator to apply migration 002, then refresh this page."
      : undefined;

  const members: AdminMember[] = membershipRows.map((item) => {
    const profile = profileById.get(item.user_id);
    return {
      id: item.id,
      userId: item.user_id,
      fullName:
        profile?.full_name ??
        (item.user_id === user.id
          ? String(user.user_metadata.full_name ?? "Workspace owner")
          : "Invited user"),
      email:
        profile?.email ??
        (item.user_id === user.id
          ? (user.email ?? "Email unavailable")
          : "Invitation pending"),
      role: item.role,
      status: item.status,
      invitedAt: item.invited_at,
      createdAt: item.created_at,
    };
  });

  const warehouses: AdminWarehouse[] = (warehousesResult.data ?? []).map(
    (item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      city: item.city,
      countryCode: item.country_code,
      isActive: item.is_active,
    }),
  );
  const assignments: AdminAssignment[] = (assignmentsResult.data ?? []).map(
    (item) => ({
      id: item.id,
      warehouseId: item.warehouse_id,
      membershipId: item.membership_id,
    }),
  );
  const auditEvents: AdminAuditEvent[] = (auditResult.data ?? []).map(
    (item) => ({
      id: item.id,
      actorId: item.actor_id,
      action: item.action,
      entityType: item.entity_type,
      metadata: item.metadata,
      occurredAt: item.occurred_at,
    }),
  );

  return (
    <AdminConsole
      organization={organizationResult.data}
      currentUserId={user.id}
      currentRole={membership.role}
      members={members}
      warehouses={warehouses}
      assignments={assignments}
      auditEvents={auditEvents}
      inviteEnabled={hasSupabaseAdminEnv()}
      success={success}
      error={error}
      setupError={setupError}
    />
  );
}
