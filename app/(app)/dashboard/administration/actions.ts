"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";
import { requireMfaSession } from "@/lib/auth/require-mfa";

const organizationIdSchema = z.uuid("Invalid organization reference.");
const manageableRoleSchema = z.enum([
  "admin",
  "procurement_manager",
  "buyer",
  "warehouse_manager",
  "operator",
  "viewer",
  "hr_manager",
  "recruiter",
]);
const membershipStatusSchema = z.enum(["invited", "active", "suspended"]);

const inviteSchema = z.object({
  organizationId: organizationIdSchema,
  email: z
    .email("Enter a valid work email.")
    .transform((value) => value.toLowerCase()),
  fullName: z.string().trim().min(2, "Enter the user’s full name.").max(80),
  role: manageableRoleSchema,
});

const membershipSchema = z.object({
  organizationId: organizationIdSchema,
  membershipId: z.uuid(),
  role: manageableRoleSchema,
  status: membershipStatusSchema,
});

const organizationSchema = z.object({
  organizationId: organizationIdSchema,
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and hyphens.",
    ),
});

const warehouseSchema = z.object({
  organizationId: organizationIdSchema,
  warehouseId: z.union([z.uuid(), z.literal("")]),
  code: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9][A-Za-z0-9-]+$/, "Use letters, numbers, and hyphens."),
  name: z.string().trim().min(2).max(100),
  city: z.string().trim().max(100),
  countryCode: z.union([z.string().trim().length(2), z.literal("")]),
});

const assignmentSchema = z.object({
  organizationId: organizationIdSchema,
  warehouseId: z.uuid(),
  membershipId: z.uuid(),
  operation: z.enum(["assign", "remove"]),
});

const resetWorkspaceSchema = z.object({
  organizationId: organizationIdSchema,
  confirmationName: z.string().trim().min(2).max(100),
  acknowledgePermanentDeletion: z.literal("on"),
});

function go(message: string, tone: "success" | "error" = "success"): never {
  redirect(`/dashboard/administration?${tone}=${encodeURIComponent(message)}`);
}

async function requireOwner(organizationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) go("Your session has expired. Sign in again.", "error");

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("id, role, status")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership || membership.role !== "owner") {
    go("Only the organization owner can perform this action.", "error");
  }

  await requireMfaSession(supabase);
  return { supabase, user };
}

function refreshAdministration() {
  revalidatePath("/dashboard/administration");
  revalidatePath("/dashboard", "layout");
}

export async function inviteMember(formData: FormData) {
  const result = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    go(
      result.error.issues[0]?.message ?? "Check the invitation details.",
      "error",
    );
  }

  const { supabase } = await requireOwner(result.data.organizationId);
  if (!hasSupabaseAdminEnv()) {
    go(
      "The secure invitation service is not configured.",
      "error",
    );
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? "http://localhost:3000";
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(
    result.data.email,
    {
      data: { full_name: result.data.fullName },
      redirectTo: `${origin}/auth/invite`,
    },
  );

  if (error || !data.user) {
    go(error?.message ?? "The invitation service could not create the invitation.", "error");
  }

  const { error: membershipError } = await supabase.rpc(
    "admin_add_invited_membership",
    {
      target_organization_id: result.data.organizationId,
      target_user_id: data.user.id,
      target_role: result.data.role,
    },
  );

  if (membershipError) {
    go(
      `The Auth invitation was created, but workspace access could not be attached: ${membershipError.message}`,
      "error",
    );
  }

  refreshAdministration();
  go(`Invitation sent to ${result.data.email}.`);
}

export async function updateMember(formData: FormData) {
  const result = membershipSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) go("Check the selected role and status.", "error");

  const { supabase } = await requireOwner(result.data.organizationId);
  const { error } = await supabase.rpc("admin_update_membership", {
    target_membership_id: result.data.membershipId,
    new_role: result.data.role,
    new_status: result.data.status,
  });
  if (error) go(error.message, "error");

  refreshAdministration();
  go("Team member access updated.");
}

export async function updateOrganization(formData: FormData) {
  const result = organizationSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    go(
      result.error.issues[0]?.message ?? "Check the organization details.",
      "error",
    );
  }

  const { supabase } = await requireOwner(result.data.organizationId);
  const { error } = await supabase.rpc("admin_update_organization", {
    target_organization_id: result.data.organizationId,
    new_name: result.data.name,
    new_slug: result.data.slug,
  });
  if (error) go(error.message, "error");

  refreshAdministration();
  go("Organization settings saved.");
}

export async function saveWarehouse(formData: FormData) {
  const result = warehouseSchema.safeParse({
    ...Object.fromEntries(formData),
    warehouseId: String(formData.get("warehouseId") ?? ""),
  });
  if (!result.success) {
    go(
      result.error.issues[0]?.message ?? "Check the warehouse details.",
      "error",
    );
  }

  const { supabase } = await requireOwner(result.data.organizationId);
  const { error } = await supabase.rpc("admin_upsert_warehouse", {
    target_organization_id: result.data.organizationId,
    target_warehouse_id: result.data.warehouseId || null,
    warehouse_code: result.data.code,
    warehouse_name: result.data.name,
    warehouse_city: result.data.city,
    warehouse_country_code: result.data.countryCode,
    warehouse_is_active: formData.get("isActive") === "on",
  });
  if (error) go(error.message, "error");

  refreshAdministration();
  go(result.data.warehouseId ? "Warehouse updated." : "Warehouse created.");
}

export async function setWarehouseAssignment(formData: FormData) {
  const result = assignmentSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) go("Select a valid warehouse and team member.", "error");

  const { supabase } = await requireOwner(result.data.organizationId);
  const { error } = await supabase.rpc("admin_set_warehouse_assignment", {
    target_warehouse_id: result.data.warehouseId,
    target_membership_id: result.data.membershipId,
    should_assign: result.data.operation === "assign",
  });
  if (error) go(error.message, "error");

  refreshAdministration();
  go(
    result.data.operation === "assign"
      ? "Warehouse access assigned."
      : "Warehouse access removed.",
  );
}

export async function resetWorkspaceData(formData: FormData) {
  const result = resetWorkspaceSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    go(
      "Confirm permanent deletion and enter the exact organization name.",
      "error",
    );
  }

  const { supabase } = await requireOwner(result.data.organizationId);
  const organization = await supabase
    .from("organizations")
    .select("name")
    .eq("id", result.data.organizationId)
    .single();
  if (organization.error || !organization.data) {
    go("The organization could not be verified.", "error");
  }
  if (organization.data.name !== result.data.confirmationName) {
    go("The organization name does not match.", "error");
  }

  const [organizationFiles, recruitmentFiles] = await Promise.all([
    listStoredFiles(
      supabase,
      "organization-documents",
      result.data.organizationId,
    ),
    listStoredFiles(
      supabase,
      "recruitment-documents",
      result.data.organizationId,
    ),
  ]);
  const storageInventoryError =
    organizationFiles.error ?? recruitmentFiles.error;
  if (storageInventoryError) {
    go(
      `Workspace file inventory could not be prepared: ${storageInventoryError}`,
      "error",
    );
  }

  const reset = await supabase.rpc("reset_organization_data", {
    target_organization_id: result.data.organizationId,
    confirmed_organization_name: result.data.confirmationName,
  });
  if (reset.error) go(reset.error.message, "error");

  const storageErrors = (
    await Promise.all([
      removeStoredFiles(
        supabase,
        "organization-documents",
        organizationFiles.paths,
      ),
      removeStoredFiles(
        supabase,
        "recruitment-documents",
        recruitmentFiles.paths,
      ),
    ])
  ).filter(Boolean);

  revalidatePath("/", "layout");
  if (storageErrors.length) {
    go(
      `Workspace data was reset, but some stored files require manual cleanup: ${storageErrors.join(" ")}`,
      "error",
    );
  }
  go(
    `Workspace reset completed. ${Number(reset.data ?? 0).toLocaleString()} records were removed; organization access and audit history were preserved.`,
  );
}

async function listStoredFiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: string,
  root: string,
): Promise<{ paths: string[]; error: string | null }> {
  const paths: string[] = [];
  const folders = [root];

  while (folders.length) {
    const folder = folders.shift()!;
    for (let offset = 0; ; offset += 100) {
      const listing = await supabase.storage.from(bucket).list(folder, {
        limit: 100,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (listing.error)
        return { paths, error: `${bucket}: ${listing.error.message}` };

      for (const item of listing.data ?? []) {
        const path = `${folder}/${item.name}`;
        if (item.id) paths.push(path);
        else folders.push(path);
      }
      if ((listing.data?.length ?? 0) < 100) break;
    }
  }

  return { paths, error: null };
}

async function removeStoredFiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: string,
  paths: string[],
) {
  for (let offset = 0; offset < paths.length; offset += 100) {
    const removal = await supabase.storage
      .from(bucket)
      .remove(paths.slice(offset, offset + 100));
    if (removal.error) return `${bucket}: ${removal.error.message}`;
  }
  return null;
}
