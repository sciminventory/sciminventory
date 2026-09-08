"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { moduleConfigs, modulePaths, type OperationalModule } from "@/lib/operations/modules";
import { canManageOperationalModule } from "@/lib/auth/permissions";
import { requireMfaSession } from "@/lib/auth/require-mfa";

const moduleSchema = z.enum([
  "products", "stock", "movements", "transfers", "cycle_counts",
  "receiving", "putaway", "picking", "locations", "requisitions",
  "rfqs", "quotations", "purchase_orders", "suppliers", "logistics", "documents",
]);

const itemSchema = z.object({
  organizationId: z.uuid(),
  module: moduleSchema,
  reference: z.string().trim().min(2, "Enter a reference with at least 2 characters.").max(60),
  title: z.string().trim().min(2, "Enter a name or title.").max(160),
  status: z.string().trim().max(40),
  quantity: z.string().trim().max(30),
  warehouseId: z.string().trim(),
  destinationWarehouseId: z.string().trim(),
  relatedId: z.string().trim(),
  detail: z.string().trim().max(240),
  dueAt: z.string().trim(),
});

const statusSchema = z.object({
  organizationId: z.uuid(),
  module: moduleSchema,
  itemId: z.uuid(),
  status: z.string().trim().min(2).max(40),
});

function routeTo(module: OperationalModule, message: string, tone: "success" | "error" = "success"): never {
  redirect(`${modulePaths[module]}?${tone}=${encodeURIComponent(message)}`);
}

async function requireContext(organizationId: string, module: OperationalModule) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!membership) routeTo(module, "You do not have access to this workspace.", "error");

  if (!canManageOperationalModule(module, membership.role)) routeTo(module, "Your role cannot change records in this module.", "error");
  await requireMfaSession(supabase);
  return { supabase, user };
}

function numberOrNull(value: string) {
  if (!value) return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function dateOrNull(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function uuidOrNull(value: string) {
  return z.uuid().safeParse(value).success ? value : null;
}

function refresh(module: OperationalModule) {
  revalidatePath(modulePaths[module]);
  revalidatePath("/dashboard");
}

export async function createOperationalItem(formData: FormData) {
  const raw = {
    organizationId: String(formData.get("organizationId") ?? ""),
    module: String(formData.get("module") ?? ""),
    reference: String(formData.get("reference") ?? ""),
    title: String(formData.get("title") ?? ""),
    status: String(formData.get("status") ?? ""),
    quantity: String(formData.get("quantity") ?? ""),
    warehouseId: String(formData.get("warehouseId") ?? ""),
    destinationWarehouseId: String(formData.get("destinationWarehouseId") ?? ""),
    relatedId: String(formData.get("relatedId") ?? ""),
    detail: String(formData.get("detail") ?? ""),
    dueAt: String(formData.get("dueAt") ?? ""),
  };
  const result = itemSchema.safeParse(raw);
  const fallbackModule = moduleSchema.safeParse(raw.module).success ? raw.module as OperationalModule : "products";
  if (!result.success) routeTo(fallbackModule, result.error.issues[0]?.message ?? "Check the form details.", "error");

  const data = result.data;
  if (data.module === "stock") routeTo(data.module, "Stock is changed through immutable movements.", "error");
  const { supabase, user } = await requireContext(data.organizationId, data.module);
  const quantity = numberOrNull(data.quantity);
  const warehouseId = uuidOrNull(data.warehouseId);
  const destinationWarehouseId = uuidOrNull(data.destinationWarehouseId);
  const relatedId = uuidOrNull(data.relatedId);
  const dueAt = dateOrNull(data.dueAt);
  let error: { message: string } | null = null;

  if (data.module === "products") {
    ({ error } = await supabase.from("products").insert({
      organization_id: data.organizationId,
      sku: data.reference.toUpperCase(),
      name: data.title,
      category: data.detail || null,
      reorder_point: quantity ?? 0,
      is_active: data.status !== "inactive",
    }));
  } else if (data.module === "suppliers") {
    ({ error } = await supabase.from("suppliers").insert({
      organization_id: data.organizationId,
      code: data.reference.toUpperCase(),
      name: data.title,
      contact_email: data.detail || null,
      lead_time_days: quantity === null ? null : Math.round(quantity),
      status: data.status || "active",
    }));
  } else if (data.module === "locations") {
    if (!warehouseId) routeTo(data.module, "Select a warehouse.", "error");
    ({ error } = await supabase.from("warehouse_locations").insert({
      organization_id: data.organizationId,
      warehouse_id: warehouseId,
      code: data.reference.toUpperCase(),
      name: data.title,
      location_type: data.status || "storage",
    }));
  } else if (data.module === "movements") {
    if (!warehouseId || !relatedId || quantity === null || quantity === 0) {
      routeTo(data.module, "Select a warehouse and product, then enter a non-zero quantity.", "error");
    }
    const movementType = z.enum(["receipt", "issue", "adjustment", "transfer_in", "transfer_out"]).safeParse(data.status);
    if (!movementType.success) routeTo(data.module, "Select a valid movement type.", "error");
    ({ error } = await supabase.rpc("post_inventory_movement", {
      target_organization_id: data.organizationId,
      target_warehouse_id: warehouseId,
      target_product_id: relatedId,
      target_movement_type: movementType.data,
      target_quantity: quantity,
      target_reference: data.reference,
      target_notes: data.detail || null,
    }));
  } else if (data.module === "transfers" || data.module === "cycle_counts") {
    if (!warehouseId) routeTo(data.module, "Select a warehouse.", "error");
    if (data.module === "transfers" && !destinationWarehouseId) routeTo(data.module, "Select a destination warehouse.", "error");
    if (data.module === "transfers" && destinationWarehouseId === warehouseId) routeTo(data.module, "Source and destination warehouses must differ.", "error");
    ({ error } = await supabase.from("inventory_operations").insert({
      organization_id: data.organizationId,
      operation_type: data.module === "transfers" ? "transfer" : "cycle_count",
      reference: data.reference,
      title: data.title,
      source_warehouse_id: warehouseId,
      destination_warehouse_id: data.module === "transfers" ? destinationWarehouseId : null,
      status: data.status || "draft",
      quantity,
      due_at: dueAt,
      notes: data.detail || null,
      created_by: user.id,
    }));
  } else if (["receiving", "putaway", "picking"].includes(data.module)) {
    if (!warehouseId) routeTo(data.module, "Select a warehouse.", "error");
    ({ error } = await supabase.from("warehouse_tasks").insert({
      organization_id: data.organizationId,
      warehouse_id: warehouseId,
      task_type: data.module as "receiving" | "putaway" | "picking",
      reference: data.reference,
      title: data.title,
      status: data.status || "open",
      quantity,
      due_at: dueAt,
      notes: data.detail || null,
      created_by: user.id,
    }));
  } else if (["requisitions", "rfqs", "quotations", "purchase_orders"].includes(data.module)) {
    const recordTypes = { requisitions: "requisition", rfqs: "rfq", quotations: "quotation", purchase_orders: "purchase_order" } as const;
    ({ error } = await supabase.from("procurement_records").insert({
      organization_id: data.organizationId,
      record_type: recordTypes[data.module as keyof typeof recordTypes],
      reference: data.reference,
      title: data.title,
      supplier_id: relatedId,
      warehouse_id: warehouseId,
      status: data.status || "draft",
      amount: quantity,
      currency: "PHP",
      due_at: dueAt,
      notes: data.detail || null,
      created_by: user.id,
    }));
  } else if (data.module === "logistics") {
    ({ error } = await supabase.from("shipments").insert({
      organization_id: data.organizationId,
      reference: data.reference,
      title: data.title,
      carrier: data.detail || null,
      warehouse_id: warehouseId,
      status: data.status || "planned",
      due_at: dueAt,
      created_by: user.id,
    }));
  } else if (data.module === "documents") {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) routeTo(data.module, "Choose a file to upload.", "error");
    if (file.size > 25 * 1024 * 1024) routeTo(data.module, "Files must be 25 MB or smaller.", "error");
    const documentId = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120);
    const storagePath = `${data.organizationId}/documents/${documentId}/${crypto.randomUUID()}-${safeName}`;
    const upload = await supabase.storage.from("organization-documents").upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (upload.error) routeTo(data.module, upload.error.message, "error");
    ({ error } = await supabase.from("documents").insert({
      id: documentId,
      organization_id: data.organizationId,
      reference: data.reference,
      title: data.title,
      document_type: data.detail || "general",
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type || null,
      file_size: file.size,
      status: data.status || "active",
      uploaded_by: user.id,
    }));
  }

  if (error) routeTo(data.module, error.message, "error");
  refresh(data.module);
  routeTo(data.module, `${moduleConfigs[data.module].singular.replace(/^./, (letter) => letter.toUpperCase())} created successfully.`);
}

export async function updateOperationalStatus(formData: FormData) {
  const result = statusSchema.safeParse(Object.fromEntries(formData));
  const fallback = moduleSchema.safeParse(formData.get("module")).success ? String(formData.get("module")) as OperationalModule : "products";
  if (!result.success) routeTo(fallback, "Select a valid status.", "error");
  const data = result.data;
  if (data.module === "stock" || data.module === "movements") routeTo(data.module, "Ledger records cannot be edited.", "error");
  const { supabase } = await requireContext(data.organizationId, data.module);
  let error: { message: string } | null = null;

  if (data.module === "products") {
    ({ error } = await supabase.from("products").update({ is_active: data.status === "active" }).eq("id", data.itemId).eq("organization_id", data.organizationId));
  } else if (data.module === "suppliers") {
    ({ error } = await supabase.from("suppliers").update({ status: data.status }).eq("id", data.itemId).eq("organization_id", data.organizationId));
  } else if (data.module === "locations") {
    ({ error } = await supabase.from("warehouse_locations").update({ location_type: data.status }).eq("id", data.itemId).eq("organization_id", data.organizationId));
  } else if (data.module === "transfers" || data.module === "cycle_counts") {
    ({ error } = await supabase.from("inventory_operations").update({ status: data.status }).eq("id", data.itemId).eq("organization_id", data.organizationId));
  } else if (["receiving", "putaway", "picking"].includes(data.module)) {
    ({ error } = await supabase.from("warehouse_tasks").update({ status: data.status }).eq("id", data.itemId).eq("organization_id", data.organizationId));
  } else if (["requisitions", "rfqs", "quotations", "purchase_orders"].includes(data.module)) {
    ({ error } = await supabase.from("procurement_records").update({ status: data.status }).eq("id", data.itemId).eq("organization_id", data.organizationId));
  } else if (data.module === "logistics") {
    ({ error } = await supabase.from("shipments").update({ status: data.status }).eq("id", data.itemId).eq("organization_id", data.organizationId));
  } else if (data.module === "documents") {
    ({ error } = await supabase.from("documents").update({ status: data.status }).eq("id", data.itemId).eq("organization_id", data.organizationId));
  }
  if (error) routeTo(data.module, error.message, "error");
  refresh(data.module);
  routeTo(data.module, "Status updated.");
}

export async function downloadDocument(formData: FormData) {
  const organizationId = z.uuid().safeParse(formData.get("organizationId"));
  const documentId = z.uuid().safeParse(formData.get("itemId"));
  if (!organizationId.success || !documentId.success) routeTo("documents", "Invalid document reference.", "error");
  const { supabase } = await requireContext(organizationId.data, "documents");
  const { data: document, error } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("organization_id", organizationId.data)
    .eq("id", documentId.data)
    .single();
  if (error || !document?.storage_path) routeTo("documents", error?.message ?? "This document has no stored file.", "error");
  const signed = await supabase.storage.from("organization-documents").createSignedUrl(document.storage_path, 60);
  if (signed.error) routeTo("documents", signed.error.message, "error");
  redirect(signed.data.signedUrl);
}
