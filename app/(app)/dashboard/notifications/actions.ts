"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const notificationSchema = z.object({
  organizationId: z.uuid(),
  notificationId: z.uuid().optional(),
});

async function notificationContext(organizationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  return membership ? { supabase, user } : null;
}

export async function markInternalNotificationRead(formData: FormData) {
  const result = notificationSchema.safeParse(Object.fromEntries(formData));
  if (!result.success || !result.data.notificationId) return;
  const context = await notificationContext(result.data.organizationId);
  if (!context) return;
  await context.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", result.data.notificationId)
    .eq("organization_id", result.data.organizationId)
    .eq("audience", "internal");
  revalidatePath("/dashboard", "layout");
}

export async function markAllInternalNotificationsRead(formData: FormData) {
  const result = notificationSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) return;
  const context = await notificationContext(result.data.organizationId);
  if (!context) return;
  await context.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("organization_id", result.data.organizationId)
    .eq("audience", "internal")
    .is("read_at", null);
  revalidatePath("/dashboard", "layout");
}

export async function openInternalNotification(formData: FormData) {
  const result = notificationSchema.safeParse(Object.fromEntries(formData));
  if (!result.success || !result.data.notificationId) redirect("/dashboard");
  const context = await notificationContext(result.data.organizationId);
  if (!context) redirect("/login");
  const { data: notification } = await context.supabase
    .from("notifications")
    .select("href")
    .eq("id", result.data.notificationId)
    .eq("organization_id", result.data.organizationId)
    .eq("audience", "internal")
    .maybeSingle();
  await context.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", result.data.notificationId)
    .eq("organization_id", result.data.organizationId)
    .eq("audience", "internal");
  revalidatePath("/dashboard", "layout");
  const href = notification?.href;
  redirect(href?.startsWith("/dashboard") ? href : "/dashboard");
}
