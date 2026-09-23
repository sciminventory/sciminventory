"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { moduleConfigs, modulePaths, type OperationalModule } from "@/lib/operations/modules";
import { canManageOperationalModule } from "@/lib/auth/permissions";
import { requireMfaSession } from "@/lib/auth/require-mfa";
import { createOperationalReference } from "@/lib/operations/references";

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
  locationId: z.string().trim(),
  supplierId: z.string().trim(),
  initialQuantity: z.string().trim().max(30),
  unitPrice: z.string().trim().max(30),
  productId: z.string().trim(),
  lineQuantity: z.string().trim().max(30),
  orderDate: z.string().trim(),
  contactPerson: z.string().trim().max(160),
  contactEmail: z.string().trim().max(254),
  phone: z.string().trim().max(50),
  taxId: z.string().trim().max(80),
  address: z.string().trim().max(240),
  city: z.string().trim().max(120),
  country: z.string().trim().max(2),
  paymentTerms: z.string().trim().max(4),
  rating: z.string().trim().max(4),
  expiryDate: z.string().trim(),
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
  const submittedModule = String(formData.get("module") ?? "");
  const submittedReference = String(formData.get("reference") ?? "").trim();
  const raw = {
    organizationId: String(formData.get("organizationId") ?? ""),
    module: submittedModule,
    reference: submittedReference || createOperationalReference(submittedModule),
    title: String(formData.get("title") ?? ""),
    status: String(formData.get("status") ?? ""),
    quantity: String(formData.get("quantity") ?? ""),
    warehouseId: String(formData.get("warehouseId") ?? ""),
    destinationWarehouseId: String(formData.get("destinationWarehouseId") ?? ""),
    relatedId: String(formData.get("relatedId") ?? ""),
    locationId: String(formData.get("locationId") ?? ""),
    supplierId: String(formData.get("supplierId") ?? ""),
    initialQuantity: String(formData.get("initialQuantity") ?? ""),
    unitPrice: String(formData.get("unitPrice") ?? ""),
    productId: String(formData.get("productId") ?? ""),
    lineQuantity: String(formData.get("lineQuantity") ?? ""),
    orderDate: String(formData.get("orderDate") ?? ""),
    contactPerson: String(formData.get("contactPerson") ?? ""),
    contactEmail: String(formData.get("contactEmail") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    taxId: String(formData.get("taxId") ?? ""),
    address: String(formData.get("address") ?? ""),
    city: String(formData.get("city") ?? ""),
    country: String(formData.get("country") ?? ""),
    paymentTerms: String(formData.get("paymentTerms") ?? ""),
    rating: String(formData.get("rating") ?? ""),
    expiryDate: String(formData.get("expiryDate") ?? ""),
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
  const locationId = uuidOrNull(data.locationId);
  const supplierId = uuidOrNull(data.supplierId);
  const initialQuantity = numberOrNull(data.initialQuantity);
  const unitPrice = numberOrNull(data.unitPrice);
  const productId = uuidOrNull(data.productId);
  const lineQuantity = numberOrNull(data.lineQuantity);
  const orderDate = data.orderDate || null;
  const paymentTerms = numberOrNull(data.paymentTerms);
  const rating = numberOrNull(data.rating);
  const expiryDate = data.expiryDate || null;
  const dueAt = dateOrNull(data.dueAt);
  let error: { message: string } | null = null;

  if (data.module === "products") {
    if (!warehouseId || !locationId || !supplierId) routeTo(data.module, "Select a warehouse, location, and supplier.", "error");
    if (initialQuantity === null || initialQuantity < 0) routeTo(data.module, "Enter a valid non-negative quantity.", "error");
    if (quantity === null || quantity < 0) routeTo(data.module, "Enter a valid non-negative reorder level.", "error");
    if (unitPrice === null || unitPrice < 0) routeTo(data.module, "Enter a valid non-negative unit price.", "error");
    ({ error } = await supabase.rpc("create_inventory_product", {
      target_organization_id: data.organizationId,
      product_sku: data.reference,
      product_name: data.title,
      product_category: data.detail,
      product_reorder_level: quantity,
      product_unit_price: unitPrice,
      target_supplier_id: supplierId,
      target_warehouse_id: warehouseId,
      target_location_id: locationId,
      initial_quantity: initialQuantity,
      product_expiry_date: expiryDate,
      product_is_active: data.status !== "inactive",
    }));
  } else if (data.module === "suppliers") {
    if (data.contactPerson.length < 2 || !z.email().safeParse(data.contactEmail).success || !data.phone || !data.taxId || !data.address || !data.city || !/^[A-Za-z]{2}$/.test(data.country)) routeTo(data.module, "Complete all supplier contact, tax, and location details.", "error");
    if (paymentTerms === null || !Number.isInteger(paymentTerms) || paymentTerms < 0 || paymentTerms > 365) routeTo(data.module, "Payment terms must be between 0 and 365 days.", "error");
    if (rating === null || rating < 0 || rating > 5) routeTo(data.module, "Rating must be between 0.00 and 5.00.", "error");
    ({ error } = await supabase.from("suppliers").insert({
      organization_id: data.organizationId,
      code: data.reference.toUpperCase(),
      name: data.title,
      legal_name: data.title,
      contact_person: data.contactPerson,
      contact_email: data.contactEmail.toLowerCase(),
      phone: data.phone,
      tax_id: data.taxId,
      address_line: data.address,
      city: data.city,
      country_code: data.country.toUpperCase(),
      payment_terms_days: paymentTerms,
      rating,
      status: data.status || "active",
      onboarding_status: data.status === "active" ? "approved" : "draft",
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
    if (!warehouseId || !locationId || !relatedId || quantity === null || quantity === 0) {
      routeTo(data.module, "Select a warehouse, location, and product, then enter a non-zero quantity.", "error");
    }
    const movementType = z.enum(["receipt", "issue", "adjustment", "transfer_in", "transfer_out"]).safeParse(data.status);
    if (!movementType.success) routeTo(data.module, "Select a valid movement type.", "error");
    ({ error } = await supabase.rpc("post_inventory_movement_at_location", {
      target_organization_id: data.organizationId,
      target_warehouse_id: warehouseId,
      target_location_id: locationId,
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
  } else if (data.module === "purchase_orders") {
    if (!relatedId || !warehouseId || !productId) routeTo(data.module, "Select a supplier, warehouse, and inventory item.", "error");
    if (!orderDate || !data.dueAt) routeTo(data.module, "Select the order and expected delivery dates.", "error");
    if (lineQuantity === null || lineQuantity <= 0 || unitPrice === null || unitPrice < 0) routeTo(data.module, "Enter a valid quantity and unit price.", "error");
    const { data: selectedProduct, error: productError } = await supabase.from("products").select("name").eq("id", productId).eq("organization_id", data.organizationId).single();
    if (productError || !selectedProduct) routeTo(data.module, "The selected inventory item is unavailable.", "error");
    const total = lineQuantity * unitPrice;
    const { data: purchaseOrder, error: purchaseOrderError } = await supabase.from("procurement_records").insert({
      organization_id: data.organizationId,
      record_type: "purchase_order",
      reference: data.reference,
      title: data.title,
      supplier_id: relatedId,
      warehouse_id: warehouseId,
      status: data.status || "draft",
      amount: total,
      currency: "PHP",
      order_date: orderDate,
      delivery_date: data.dueAt,
      due_at: dueAt,
      notes: data.detail || null,
      created_by: user.id,
    }).select("id").single();
    if (purchaseOrderError || !purchaseOrder) routeTo(data.module, purchaseOrderError?.message ?? "Unable to create the purchase order.", "error");
    const { error: lineError } = await supabase.from("procurement_record_lines").insert({
      organization_id: data.organizationId,
      procurement_record_id: purchaseOrder.id,
      product_id: productId,
      line_number: 1,
      description: selectedProduct.name,
      quantity: lineQuantity,
      unit_price: unitPrice,
      promised_date: data.dueAt,
    });
    if (lineError) {
      await supabase.from("procurement_records").delete().eq("id", purchaseOrder.id).eq("organization_id", data.organizationId);
      routeTo(data.module, lineError.message, "error");
    }
  } else if (["requisitions", "rfqs", "quotations"].includes(data.module)) {
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

export async function updateOperationalItem(formData: FormData) {
  const itemId = z.uuid().safeParse(formData.get("itemId"));
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
    locationId: String(formData.get("locationId") ?? ""),
    supplierId: String(formData.get("supplierId") ?? ""),
    initialQuantity: String(formData.get("initialQuantity") ?? ""),
    unitPrice: String(formData.get("unitPrice") ?? ""),
    productId: String(formData.get("productId") ?? ""),
    lineQuantity: String(formData.get("lineQuantity") ?? ""),
    orderDate: String(formData.get("orderDate") ?? ""),
    contactPerson: String(formData.get("contactPerson") ?? ""),
    contactEmail: String(formData.get("contactEmail") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    taxId: String(formData.get("taxId") ?? ""),
    address: String(formData.get("address") ?? ""),
    city: String(formData.get("city") ?? ""),
    country: String(formData.get("country") ?? ""),
    paymentTerms: String(formData.get("paymentTerms") ?? ""),
    rating: String(formData.get("rating") ?? ""),
    expiryDate: String(formData.get("expiryDate") ?? ""),
    detail: String(formData.get("detail") ?? ""),
    dueAt: String(formData.get("dueAt") ?? ""),
  };
  const result = itemSchema.safeParse(raw);
  const fallback = moduleSchema.safeParse(raw.module).success ? raw.module as OperationalModule : "products";
  if (!itemId.success || !result.success) routeTo(fallback, result.success ? "Invalid record." : result.error.issues[0]?.message ?? "Check the form details.", "error");
  const data = result.data;
  if (data.module === "stock" || data.module === "movements") routeTo(data.module, "Ledger and balance records cannot be edited directly.", "error");
  const { supabase } = await requireContext(data.organizationId, data.module);
  const quantity = numberOrNull(data.quantity);
  const warehouseId = uuidOrNull(data.warehouseId);
  const destinationWarehouseId = uuidOrNull(data.destinationWarehouseId);
  const relatedId = uuidOrNull(data.relatedId);
  const locationId = uuidOrNull(data.locationId);
  const supplierId = uuidOrNull(data.supplierId);
  const unitPrice = numberOrNull(data.unitPrice);
  const productId = uuidOrNull(data.productId);
  const lineQuantity = numberOrNull(data.lineQuantity);
  const orderDate = data.orderDate || null;
  const paymentTerms = numberOrNull(data.paymentTerms);
  const rating = numberOrNull(data.rating);
  const expiryDate = data.expiryDate || null;
  const dueAt = dateOrNull(data.dueAt);
  let error: { message: string } | null = null;
  if (data.module === "products") {
    if (!warehouseId || !locationId || !supplierId) routeTo(data.module, "Select a warehouse, location, and supplier.", "error");
    if (quantity === null || quantity < 0 || unitPrice === null || unitPrice < 0) routeTo(data.module, "Reorder level and unit price must be non-negative numbers.", "error");
    ({ error } = await supabase.from("products").update({
      sku: data.reference.toUpperCase(),
      name: data.title,
      category: data.detail || null,
      reorder_point: quantity,
      unit_price: unitPrice,
      default_supplier_id: supplierId,
      default_warehouse_id: warehouseId,
      default_location_id: locationId,
      expiry_date: expiryDate,
      is_active: data.status === "active",
    }).eq("id", itemId.data).eq("organization_id", data.organizationId));
  } else if (data.module === "suppliers") {
    if (data.contactPerson.length < 2 || !z.email().safeParse(data.contactEmail).success || !data.phone || !data.taxId || !data.address || !data.city || !/^[A-Za-z]{2}$/.test(data.country)) routeTo(data.module, "Complete all supplier contact, tax, and location details.", "error");
    if (paymentTerms === null || !Number.isInteger(paymentTerms) || paymentTerms < 0 || paymentTerms > 365) routeTo(data.module, "Payment terms must be between 0 and 365 days.", "error");
    if (rating === null || rating < 0 || rating > 5) routeTo(data.module, "Rating must be between 0.00 and 5.00.", "error");
    ({ error } = await supabase.from("suppliers").update({
      code: data.reference.toUpperCase(),
      name: data.title,
      legal_name: data.title,
      contact_person: data.contactPerson,
      contact_email: data.contactEmail.toLowerCase(),
      phone: data.phone,
      tax_id: data.taxId,
      address_line: data.address,
      city: data.city,
      country_code: data.country.toUpperCase(),
      payment_terms_days: paymentTerms,
      rating,
      status: data.status,
    }).eq("id", itemId.data).eq("organization_id", data.organizationId));
  } else if (data.module === "locations") {
    if (!warehouseId) routeTo(data.module, "Select a warehouse.", "error");
    ({ error } = await supabase.from("warehouse_locations").update({ warehouse_id: warehouseId, code: data.reference.toUpperCase(), name: data.title, location_type: data.status }).eq("id", itemId.data).eq("organization_id", data.organizationId));
  } else if (data.module === "transfers" || data.module === "cycle_counts") {
    if (!warehouseId) routeTo(data.module, "Select a warehouse.", "error");
    if (data.module === "transfers" && (!destinationWarehouseId || destinationWarehouseId === warehouseId)) routeTo(data.module, "Select a different destination warehouse.", "error");
    ({ error } = await supabase.from("inventory_operations").update({ reference: data.reference, title: data.title, source_warehouse_id: warehouseId, destination_warehouse_id: data.module === "transfers" ? destinationWarehouseId : null, status: data.status, quantity, due_at: dueAt, notes: data.detail || null }).eq("id", itemId.data).eq("organization_id", data.organizationId));
  } else if (["receiving", "putaway", "picking"].includes(data.module)) {
    if (!warehouseId) routeTo(data.module, "Select a warehouse.", "error");
    ({ error } = await supabase.from("warehouse_tasks").update({ warehouse_id: warehouseId, reference: data.reference, title: data.title, status: data.status, quantity, due_at: dueAt, notes: data.detail || null }).eq("id", itemId.data).eq("organization_id", data.organizationId));
  } else if (data.module === "purchase_orders") {
    if (!relatedId || !warehouseId || !productId) routeTo(data.module, "Select a supplier, warehouse, and inventory item.", "error");
    if (!orderDate || !data.dueAt) routeTo(data.module, "Select the order and expected delivery dates.", "error");
    if (lineQuantity === null || lineQuantity <= 0 || unitPrice === null || unitPrice < 0) routeTo(data.module, "Enter a valid quantity and unit price.", "error");
    const { data: selectedProduct, error: productError } = await supabase.from("products").select("name").eq("id", productId).eq("organization_id", data.organizationId).single();
    if (productError || !selectedProduct) routeTo(data.module, "The selected inventory item is unavailable.", "error");
    const total = lineQuantity * unitPrice;
    ({ error } = await supabase.from("procurement_records").update({
      reference: data.reference,
      title: data.title,
      supplier_id: relatedId,
      warehouse_id: warehouseId,
      status: data.status,
      amount: total,
      currency: "PHP",
      order_date: orderDate,
      delivery_date: data.dueAt,
      due_at: dueAt,
      notes: data.detail || null,
    }).eq("id", itemId.data).eq("organization_id", data.organizationId));
    if (!error) {
      ({ error } = await supabase.from("procurement_record_lines").upsert({
        organization_id: data.organizationId,
        procurement_record_id: itemId.data,
        product_id: productId,
        line_number: 1,
        description: selectedProduct.name,
        quantity: lineQuantity,
        unit_price: unitPrice,
        promised_date: data.dueAt,
      }, { onConflict: "procurement_record_id,line_number" }));
    }
  } else if (["requisitions", "rfqs", "quotations"].includes(data.module)) {
    ({ error } = await supabase.from("procurement_records").update({ reference: data.reference, title: data.title, supplier_id: relatedId, warehouse_id: warehouseId, status: data.status, amount: quantity, currency: "PHP", due_at: dueAt, notes: data.detail || null }).eq("id", itemId.data).eq("organization_id", data.organizationId));
  } else if (data.module === "logistics") {
    ({ error } = await supabase.from("shipments").update({ reference: data.reference, title: data.title, carrier: data.detail || null, warehouse_id: warehouseId, status: data.status, due_at: dueAt }).eq("id", itemId.data).eq("organization_id", data.organizationId));
  } else if (data.module === "documents") {
    ({ error } = await supabase.from("documents").update({ reference: data.reference, title: data.title, document_type: data.detail || "general", status: data.status }).eq("id", itemId.data).eq("organization_id", data.organizationId));
  }
  if (error) routeTo(data.module, error.message, "error");
  refresh(data.module);
  routeTo(data.module, `${moduleConfigs[data.module].singular.replace(/^./, (letter) => letter.toUpperCase())} updated successfully.`);
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

export async function deleteOperationalItem(formData: FormData) {
  const deleteSchema = statusSchema.pick({ organizationId: true, module: true, itemId: true });
  const result = deleteSchema.safeParse(Object.fromEntries(formData));
  const fallback = moduleSchema.safeParse(formData.get("module")).success ? String(formData.get("module")) as OperationalModule : "products";
  if (!result.success || !["products", "purchase_orders", "suppliers"].includes(result.data.module)) routeTo(fallback, "Invalid record reference.", "error");
  const data = result.data;
  const { supabase } = await requireContext(data.organizationId, data.module);
  if (data.module === "products") {
    const { error } = await supabase.from("products").update({ is_active: false }).eq("id", data.itemId).eq("organization_id", data.organizationId);
    if (error) routeTo(data.module, error.message, "error");
  } else if (data.module === "purchase_orders") {
    const { error } = await supabase.from("procurement_records").delete().eq("id", data.itemId).eq("organization_id", data.organizationId).eq("record_type", "purchase_order");
    if (error) routeTo(data.module, "This purchase order is already linked to another transaction and cannot be deleted.", "error");
  } else {
    const { error } = await supabase.from("suppliers").update({ status: "inactive" }).eq("id", data.itemId).eq("organization_id", data.organizationId);
    if (error) routeTo(data.module, error.message, "error");
  }
  refresh(data.module);
  routeTo(data.module, data.module === "products" ? "Product deleted. Inventory history was preserved." : data.module === "suppliers" ? "Supplier deleted. Transaction history was preserved." : "Purchase order deleted.");
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
