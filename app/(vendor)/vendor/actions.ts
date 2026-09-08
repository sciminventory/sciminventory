"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { validateVendorDocument } from "@/lib/vendor/document-files";

const uuid = z.uuid();
type Section = "profile" | "catalog" | "orders" | "shipments" | "invoices" | "performance";
type VendorRole = "admin" | "member" | "finance" | "logistics";

function go(section: Section, message: string, tone: "success" | "error" = "success"): never {
  redirect(`/vendor/${section}?${tone}=${encodeURIComponent(message)}`);
}

async function requireVendor(section: Section, allowedRoles: VendorRole[] = ["admin", "member", "finance", "logistics"]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const access = await supabase.from("vendor_users").select("organization_id,supplier_id,role,status").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!access.data) redirect("/dashboard");
  if (!allowedRoles.includes(access.data.role as VendorRole)) go(section, "Your vendor role cannot perform this action.", "error");
  return { supabase, user, access: access.data };
}

function refresh() {
  revalidatePath("/vendor", "layout");
  revalidatePath("/dashboard/vendors");
}

function split(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))].slice(0, 50);
}

export async function updateVendorProfile(formData: FormData) {
  const result = z.object({ contactEmail: z.email(), phone: z.string().trim().max(50), website: z.string().trim().max(300), address: z.string().trim().max(500), city: z.string().trim().max(120), province: z.string().trim().max(120), postalCode: z.string().trim().max(30), deliveryCapacity: z.coerce.number().min(0), deliveryMethods: z.string().max(1000), serviceAreas: z.string().max(1000) }).safeParse(Object.fromEntries(formData));
  if (!result.success) go("profile", result.error.issues[0]?.message ?? "Check the profile.", "error");
  const { supabase, access } = await requireVendor("profile", ["admin"]);
  const data = result.data;
  const { error } = await supabase.rpc("vendor_update_my_profile", { target_organization_id: access.organization_id, target_supplier_id: access.supplier_id, new_contact_email: data.contactEmail, new_phone: data.phone, new_website: data.website, new_address_line: data.address, new_city: data.city, new_province: data.province, new_postal_code: data.postalCode, new_delivery_capacity: data.deliveryCapacity, new_delivery_methods: split(data.deliveryMethods), new_service_areas: split(data.serviceAreas) });
  if (error) go("profile", error.message, "error");
  refresh();
  go("profile", "Company profile updated.");
}

export async function addVendorContact(formData: FormData) {
  const result = z.object({ fullName: z.string().trim().min(2).max(120), email: z.email(), phone: z.string().trim().max(50), jobTitle: z.string().trim().max(120), isPrimary: z.string().optional() }).safeParse(Object.fromEntries(formData));
  if (!result.success) go("profile", result.error.issues[0]?.message ?? "Check the contact details.", "error");
  const { supabase, access } = await requireVendor("profile", ["admin"]);
  const data = result.data;
  const { error } = await supabase.from("vendor_contacts").insert({ organization_id: access.organization_id, supplier_id: access.supplier_id, full_name: data.fullName, email: data.email.toLowerCase(), phone: data.phone || null, job_title: data.jobTitle || null, is_primary: data.isPrimary === "on" });
  if (error) go("profile", error.message, "error");
  refresh();
  go("profile", "Vendor contact added.");
}

export async function addVendorAddress(formData: FormData) {
  const result = z.object({ addressType: z.enum(["office", "warehouse", "billing", "returns"]), label: z.string().trim().min(2).max(120), addressLine: z.string().trim().min(3).max(500), city: z.string().trim().min(2).max(120), province: z.string().trim().max(120), postalCode: z.string().trim().max(30), countryCode: z.string().trim().length(2), isPrimary: z.string().optional() }).safeParse(Object.fromEntries(formData));
  if (!result.success) go("profile", result.error.issues[0]?.message ?? "Check the address.", "error");
  const { supabase, access } = await requireVendor("profile", ["admin"]);
  const data = result.data;
  const { error } = await supabase.from("vendor_addresses").insert({ organization_id: access.organization_id, supplier_id: access.supplier_id, address_type: data.addressType, label: data.label, address_line: data.addressLine, city: data.city, province: data.province || null, postal_code: data.postalCode || null, country_code: data.countryCode.toUpperCase(), is_primary: data.isPrimary === "on" });
  if (error) go("profile", error.message, "error");
  refresh();
  go("profile", "Vendor address added.");
}

export async function addVendorShippingRule(formData: FormData) {
  const result = z.object({ shippingMethod: z.string().trim().min(2).max(120), serviceArea: z.string().trim().min(2).max(160), cutoffTime: z.string(), delayPenaltyRate: z.coerce.number().min(0).max(100), instructions: z.string().trim().max(1000) }).safeParse(Object.fromEntries(formData));
  if (!result.success) go("profile", result.error.issues[0]?.message ?? "Check the shipping rule.", "error");
  const { supabase, access } = await requireVendor("profile", ["admin"]);
  const data = result.data;
  const { error } = await supabase.from("vendor_shipping_rules").insert({ organization_id: access.organization_id, supplier_id: access.supplier_id, shipping_method: data.shippingMethod, service_area: data.serviceArea, cutoff_time: data.cutoffTime || null, delay_penalty_rate: data.delayPenaltyRate, instructions: data.instructions || null, is_active: true });
  if (error) go("profile", error.message, "error");
  refresh();
  go("profile", "Shipping rule added.");
}

export async function addPortalCatalogItem(formData: FormData) {
  const result = z.object({ productId: z.string(), itemCode: z.string().trim().min(1).max(80), description: z.string().trim().min(2).max(500), unitPrice: z.coerce.number().min(0), moq: z.coerce.number().positive(), leadTimeDays: z.coerce.number().int().min(0).max(3650), deliveryWindowDays: z.coerce.number().int().min(0).max(365), packagingSpecs: z.string().trim().max(1000) }).safeParse(Object.fromEntries(formData));
  if (!result.success) go("catalog", result.error.issues[0]?.message ?? "Check the catalog item.", "error");
  const { supabase, access } = await requireVendor("catalog", ["admin", "member"]);
  const data = result.data;
  const { error } = await supabase.from("vendor_catalog_items").insert({ organization_id: access.organization_id, supplier_id: access.supplier_id, product_id: data.productId || null, vendor_item_code: data.itemCode, description: data.description, unit_price: data.unitPrice, currency: "PHP", minimum_order_quantity: data.moq, lead_time_days: data.leadTimeDays, delivery_window_days: data.deliveryWindowDays, packaging_specs: data.packagingSpecs || null, status: "draft" });
  if (error) go("catalog", error.message, "error");
  refresh();
  go("catalog", "Catalog item submitted.");
}

export async function uploadVendorDocument(formData: FormData) {
  const result = z.object({ documentType: z.string().trim().min(2).max(80), title: z.string().trim().min(2).max(160), expiresAt: z.string() }).safeParse(Object.fromEntries(formData));
  if (!result.success) go("profile", result.error.issues[0]?.message ?? "Check the document details.", "error");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) go("profile", "Choose a document to upload.", "error");
  const validation = await validateVendorDocument(file);
  if (!validation.ok) go("profile", validation.message, "error");
  const { supabase, user, access } = await requireVendor("profile", ["admin", "member"]);
  const path = `${access.organization_id}/vendors/${access.supplier_id}/${crypto.randomUUID()}-${validation.safeName}`;
  const upload = await supabase.storage.from("organization-documents").upload(path, file, { contentType: validation.contentType, upsert: false });
  if (upload.error) go("profile", upload.error.message, "error");
  const inserted = await supabase.from("vendor_documents").insert({ organization_id: access.organization_id, supplier_id: access.supplier_id, document_type: result.data.documentType, title: result.data.title, storage_path: path, file_name: file.name, mime_type: validation.contentType, file_size: file.size, status: "submitted", expires_at: result.data.expiresAt || null, uploaded_by: user.id });
  if (inserted.error) {
    await supabase.storage.from("organization-documents").remove([path]);
    go("profile", inserted.error.message, "error");
  }
  await supabase.from("notifications").insert({ organization_id: access.organization_id, supplier_id: access.supplier_id, audience: "internal", title: "Vendor document submitted", message: `${result.data.title} is ready for verification.`, href: `/dashboard/vendors?vendor=${access.supplier_id}` });
  refresh();
  go("profile", "Document uploaded for verification.");
}

export async function acknowledgePurchaseOrder(formData: FormData) {
  const result = z.object({ purchaseOrderId: uuid, response: z.enum(["confirmed", "revised", "rejected"]), proposedAmount: z.string(), proposedDeliveryDate: z.string(), message: z.string().trim().max(2000) }).safeParse(Object.fromEntries(formData));
  if (!result.success) go("orders", "Check the acknowledgement details.", "error");
  const { supabase, access } = await requireVendor("orders", ["admin", "member"]);
  const { error } = await supabase.rpc("acknowledge_purchase_order", { target_organization_id: access.organization_id, target_supplier_id: access.supplier_id, target_purchase_order_id: result.data.purchaseOrderId, target_response: result.data.response, target_proposed_amount: result.data.proposedAmount ? Number(result.data.proposedAmount) : null, target_proposed_delivery_date: result.data.proposedDeliveryDate || null, target_message: result.data.message || null });
  if (error) go("orders", error.message, "error");
  refresh();
  go("orders", `Purchase order ${result.data.response}.`);
}

export async function createVendorShipment(formData: FormData) {
  const result = z.object({ purchaseOrderId: uuid, purchaseOrderLineId: uuid, productId: z.string(), warehouseId: uuid, reference: z.string().trim().min(2).max(60), title: z.string().trim().min(2).max(160), description: z.string().trim().min(2).max(500), quantity: z.coerce.number().positive(), carrier: z.string().trim().max(120), trackingNumber: z.string().trim().max(120), vehicleDetails: z.string().trim().max(300), expectedArrivalAt: z.string() }).safeParse(Object.fromEntries(formData));
  if (!result.success) go("shipments", result.error.issues[0]?.message ?? "Check the shipment.", "error");
  const { supabase, user, access } = await requireVendor("shipments", ["admin", "logistics"]);
  const data = result.data;
  const shipmentId = crypto.randomUUID();
  const shipment = await supabase.from("shipments").insert({ id: shipmentId, organization_id: access.organization_id, supplier_id: access.supplier_id, purchase_order_id: data.purchaseOrderId, warehouse_id: data.warehouseId, reference: data.reference, title: data.title, carrier: data.carrier || null, tracking_number: data.trackingNumber || null, vehicle_details: data.vehicleDetails || null, expected_arrival_at: data.expectedArrivalAt ? new Date(data.expectedArrivalAt).toISOString() : null, due_at: data.expectedArrivalAt ? new Date(data.expectedArrivalAt).toISOString() : null, status: "processing", created_by: user.id });
  if (shipment.error) go("shipments", shipment.error.message, "error");
  const line = await supabase.from("shipment_lines").insert({ organization_id: access.organization_id, shipment_id: shipmentId, purchase_order_line_id: data.purchaseOrderLineId, product_id: data.productId || null, description: data.description, quantity: data.quantity });
  if (line.error) {
    await supabase.from("shipments").delete().eq("id", shipmentId);
    go("shipments", line.error.message, "error");
  }
  await Promise.all([
    supabase.from("shipment_events").insert({ organization_id: access.organization_id, shipment_id: shipmentId, status: "processing", message: "Shipment created by vendor.", recorded_by: user.id }),
    supabase.from("notifications").insert({ organization_id: access.organization_id, supplier_id: access.supplier_id, audience: "internal", title: `Shipment ${data.reference} created`, message: `The vendor is preparing ${data.quantity} units.`, href: `/dashboard/vendors?vendor=${access.supplier_id}` }),
  ]);
  refresh();
  go("shipments", "Shipment created and linked to the purchase order.");
}

export async function updateVendorShipment(formData: FormData) {
  const result = z.object({ shipmentId: uuid, status: z.enum(["processing", "packing", "ready_for_shipment", "dispatched", "in_transit", "arrived", "exception"]), location: z.string().trim().max(200), latitude: z.string(), longitude: z.string(), message: z.string().trim().max(1000) }).safeParse(Object.fromEntries(formData));
  if (!result.success) go("shipments", "Select a valid shipment update.", "error");
  const { supabase, user, access } = await requireVendor("shipments", ["admin", "logistics"]);
  const data = result.data;
  const latitude = data.latitude ? Number(data.latitude) : null;
  const longitude = data.longitude ? Number(data.longitude) : null;
  if ((latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) || (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))) go("shipments", "Enter valid GPS coordinates.", "error");
  const shipment = await supabase.from("shipments").update({ status: data.status, dispatched_at: data.status === "dispatched" ? new Date().toISOString() : undefined }).eq("id", data.shipmentId).eq("supplier_id", access.supplier_id);
  if (shipment.error) go("shipments", shipment.error.message, "error");
  await Promise.all([
    supabase.from("shipment_events").insert({ organization_id: access.organization_id, shipment_id: data.shipmentId, status: data.status, location: data.location || null, latitude, longitude, message: data.message || null, recorded_by: user.id }),
    supabase.from("notifications").insert({ organization_id: access.organization_id, supplier_id: access.supplier_id, audience: "internal", title: `Shipment ${data.status.replaceAll("_", " ")}`, message: data.message || "A vendor shipment was updated.", href: `/dashboard/vendors?vendor=${access.supplier_id}` }),
  ]);
  refresh();
  go("shipments", "Shipment status updated.");
}

export async function submitVendorInvoice(formData: FormData) {
  const result = z.object({ purchaseOrderId: uuid, purchaseOrderLineId: z.string(), invoiceNumber: z.string().trim().min(2).max(80), invoiceDate: z.string().date(), dueDate: z.string().date(), description: z.string().trim().min(2).max(500), quantity: z.coerce.number().positive(), unitPrice: z.coerce.number().min(0), taxRate: z.coerce.number().min(0).max(100) }).safeParse(Object.fromEntries(formData));
  if (!result.success) go("invoices", result.error.issues[0]?.message ?? "Check the invoice.", "error");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) go("invoices", "Attach the invoice PDF or DOCX file.", "error");
  const validation = await validateVendorDocument(file, true);
  if (!validation.ok) go("invoices", validation.message, "error");
  const { supabase, user, access } = await requireVendor("invoices", ["admin", "finance"]);
  const data = result.data;
  const subtotal = data.quantity * data.unitPrice;
  const tax = subtotal * data.taxRate / 100;
  const invoiceId = crypto.randomUUID();
  const storagePath = `${access.organization_id}/vendors/${access.supplier_id}/invoices/${invoiceId}-${validation.safeName}`;
  const upload = await supabase.storage.from("organization-documents").upload(storagePath, file, { contentType: validation.contentType, upsert: false });
  if (upload.error) go("invoices", upload.error.message, "error");
  const invoice = await supabase.from("vendor_invoices").insert({ id: invoiceId, organization_id: access.organization_id, supplier_id: access.supplier_id, purchase_order_id: data.purchaseOrderId, invoice_number: data.invoiceNumber, invoice_date: data.invoiceDate, due_date: data.dueDate, subtotal, tax_amount: tax, total_amount: subtotal + tax, currency: "PHP", status: "submitted", storage_path: storagePath, submitted_by: user.id });
  if (invoice.error) {
    await supabase.storage.from("organization-documents").remove([storagePath]);
    go("invoices", invoice.error.message, "error");
  }
  const line = await supabase.from("vendor_invoice_lines").insert({ organization_id: access.organization_id, invoice_id: invoiceId, purchase_order_line_id: data.purchaseOrderLineId || null, description: data.description, quantity: data.quantity, unit_price: data.unitPrice, tax_rate: data.taxRate });
  if (line.error) {
    await supabase.from("vendor_invoices").delete().eq("id", invoiceId);
    await supabase.storage.from("organization-documents").remove([storagePath]);
    go("invoices", line.error.message, "error");
  }
  await supabase.from("notifications").insert({ organization_id: access.organization_id, supplier_id: access.supplier_id, audience: "internal", title: `Invoice ${data.invoiceNumber} submitted`, message: "Run three-way matching before payment approval.", href: `/dashboard/vendors?vendor=${access.supplier_id}` });
  refresh();
  go("invoices", "Invoice submitted for three-way matching.");
}

export async function markVendorNotificationRead(formData: FormData) {
  const notificationId = uuid.safeParse(formData.get("notificationId"));
  if (!notificationId.success) redirect("/vendor");
  const { supabase } = await requireVendor("profile");
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", notificationId.data);
  refresh();
  redirect("/vendor");
}
