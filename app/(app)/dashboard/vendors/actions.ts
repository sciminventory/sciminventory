"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hasPermission } from "@/lib/auth/permissions";
import { requireMfaSession } from "@/lib/auth/require-mfa";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const id = z.uuid();

function go(message: string, tone: "success" | "error" = "success", supplierId?: string): never {
  const query = new URLSearchParams({ [tone]: message });
  if (supplierId) query.set("vendor", supplierId);
  redirect(`/dashboard/vendors?${query}`);
}

async function requireVendorManager(organizationId: string, manage = true) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership } = await supabase.from("organization_memberships").select("role").eq("organization_id", organizationId).eq("user_id", user.id).eq("status", "active").maybeSingle();
  if (!membership || !hasPermission(membership.role, manage ? "vendors.manage" : "vendors.read")) go("Your role does not have vendor management access.", "error");
  await requireMfaSession(supabase);
  return { supabase, user };
}

function list(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))].slice(0, 50);
}

function refresh() {
  revalidatePath("/dashboard/vendors");
  revalidatePath("/vendor");
  revalidatePath("/dashboard", "layout");
}

export async function createVendor(formData: FormData) {
  const result = z.object({
    organizationId: id,
    code: z.string().trim().min(2).max(30),
    name: z.string().trim().min(2).max(160),
    legalName: z.string().trim().min(2).max(200),
    email: z.email(),
    phone: z.string().trim().max(50),
    category: z.enum(["raw_material", "finished_goods", "spare_parts", "logistics_provider", "services"]),
    taxId: z.string().trim().max(80),
    registrationNumber: z.string().trim().max(80),
    paymentTermsDays: z.coerce.number().int().min(0).max(365),
    creditLimit: z.coerce.number().min(0),
    leadTimeDays: z.coerce.number().int().min(0).max(3650),
    deliveryCapacity: z.coerce.number().min(0),
    serviceAreas: z.string().max(1000),
    deliveryMethods: z.string().max(1000),
    address: z.string().trim().max(500),
    city: z.string().trim().max(120),
  }).safeParse(Object.fromEntries(formData));
  if (!result.success) go(result.error.issues[0]?.message ?? "Check the vendor details.", "error");
  const data = result.data;
  const { supabase } = await requireVendorManager(data.organizationId);
  const inserted = await supabase.from("suppliers").insert({
    organization_id: data.organizationId,
    code: data.code.toUpperCase(),
    name: data.name,
    legal_name: data.legalName,
    contact_email: data.email.toLowerCase(),
    phone: data.phone || null,
    vendor_category: data.category,
    tax_id: data.taxId || null,
    registration_number: data.registrationNumber || null,
    payment_terms_days: data.paymentTermsDays,
    credit_limit: data.creditLimit,
    lead_time_days: data.leadTimeDays,
    delivery_capacity: data.deliveryCapacity,
    service_areas: list(data.serviceAreas),
    delivery_methods: list(data.deliveryMethods),
    address_line: data.address || null,
    city: data.city || null,
    onboarding_status: "submitted",
    status: "on_hold",
    currency: "PHP",
  }).select("id").single();
  if (inserted.error || !inserted.data) go(inserted.error?.message ?? "Vendor could not be created.", "error");
  refresh();
  go("Vendor application created.", "success", inserted.data.id);
}

export async function reviewVendor(formData: FormData) {
  const result = z.object({
    organizationId: id,
    supplierId: id,
    onboardingStatus: z.enum(["under_review", "changes_requested", "approved", "rejected", "suspended", "archived"]),
    riskRating: z.enum(["unrated", "low", "medium", "high"]),
    notes: z.string().trim().max(4000),
  }).safeParse(Object.fromEntries(formData));
  if (!result.success) go("Select a valid review decision.", "error");
  const data = result.data;
  const { supabase, user } = await requireVendorManager(data.organizationId);
  const current = await supabase.from("suppliers").select("onboarding_status").eq("organization_id", data.organizationId).eq("id", data.supplierId).single();
  if (current.error) go(current.error.message, "error", data.supplierId);
  const approved = data.onboardingStatus === "approved";
  const { error } = await supabase.from("suppliers").update({
    onboarding_status: data.onboardingStatus,
    status: approved ? "active" : ["suspended", "archived", "rejected"].includes(data.onboardingStatus) ? "inactive" : "on_hold",
    risk_rating: data.riskRating,
    notes: data.notes || null,
    approved_at: approved ? new Date().toISOString() : null,
    approved_by: approved ? user.id : null,
  }).eq("organization_id", data.organizationId).eq("id", data.supplierId);
  if (error) go(error.message, "error", data.supplierId);
  await Promise.all([
    supabase.from("workflow_events").insert({ organization_id: data.organizationId, supplier_id: data.supplierId, entity_type: "vendor", entity_id: data.supplierId, from_status: current.data.onboarding_status, to_status: data.onboardingStatus, message: data.notes || null, actor_id: user.id }),
    supabase.from("notifications").insert({ organization_id: data.organizationId, supplier_id: data.supplierId, audience: "vendor", title: `Vendor review: ${data.onboardingStatus.replaceAll("_", " ")}`, message: data.notes || "Your vendor profile status was updated.", href: "/vendor/profile" }),
  ]);
  refresh();
  go("Vendor review saved.", "success", data.supplierId);
}

export async function verifyVendorDocument(formData: FormData) {
  const result = z.object({
    organizationId: id,
    supplierId: id,
    documentId: id,
    status: z.enum(["verified", "rejected", "archived"]),
  }).safeParse(Object.fromEntries(formData));
  if (!result.success) go("Invalid document decision.", "error");
  const data = result.data;
  const { supabase, user } = await requireVendorManager(data.organizationId);
  const { error } = await supabase.from("vendor_documents").update({
    status: data.status,
    verified_at: data.status === "verified" ? new Date().toISOString() : null,
    verified_by: data.status === "verified" ? user.id : null,
  }).eq("organization_id", data.organizationId).eq("supplier_id", data.supplierId).eq("id", data.documentId);
  if (error) go(error.message, "error", data.supplierId);
  await supabase.from("notifications").insert({
    organization_id: data.organizationId,
    supplier_id: data.supplierId,
    audience: "vendor",
    title: `Document ${data.status}`,
    message: `A compliance document was marked ${data.status}.`,
    href: "/vendor/profile",
  });
  refresh();
  go("Document decision saved.", "success", data.supplierId);
}

export async function inviteVendorUser(formData: FormData) {
  const result = z.object({ organizationId: id, supplierId: id, fullName: z.string().trim().min(2).max(80), email: z.email(), role: z.enum(["admin", "member", "finance", "logistics"]) }).safeParse(Object.fromEntries(formData));
  if (!result.success) go(result.error.issues[0]?.message ?? "Check the invitation.", "error");
  if (!hasSupabaseAdminEnv()) go("Server invitation credentials are not configured.", "error", result.data.supplierId);
  const data = result.data;
  const { user } = await requireVendorManager(data.organizationId);
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const admin = createAdminClient();
  const invitation = await admin.auth.admin.inviteUserByEmail(data.email.toLowerCase(), { data: { full_name: data.fullName, account_type: "vendor" }, redirectTo: `${origin}/auth/vendor-invite` });
  if (invitation.error || !invitation.data.user) go(invitation.error?.message ?? "Invitation could not be sent.", "error", data.supplierId);
  const access = await admin.from("vendor_users").upsert({ organization_id: data.organizationId, supplier_id: data.supplierId, user_id: invitation.data.user.id, role: data.role, status: "invited", invited_by: user.id, invited_at: new Date().toISOString() }, { onConflict: "organization_id,supplier_id,user_id" });
  if (access.error) go(`Invitation was sent but vendor access failed: ${access.error.message}`, "error", data.supplierId);
  refresh();
  go(`Invitation sent to ${data.email}.`, "success", data.supplierId);
}

export async function addVendorCatalogItem(formData: FormData) {
  const result = z.object({ organizationId: id, supplierId: id, productId: z.string(), itemCode: z.string().trim().min(1).max(80), description: z.string().trim().min(2).max(500), unitPrice: z.coerce.number().min(0), moq: z.coerce.number().positive(), leadTimeDays: z.coerce.number().int().min(0).max(3650), deliveryWindowDays: z.coerce.number().int().min(0).max(365), packagingSpecs: z.string().trim().max(1000) }).safeParse(Object.fromEntries(formData));
  if (!result.success) go(result.error.issues[0]?.message ?? "Check the catalog item.", "error");
  const data = result.data;
  const { supabase } = await requireVendorManager(data.organizationId);
  const { error } = await supabase.from("vendor_catalog_items").insert({ organization_id: data.organizationId, supplier_id: data.supplierId, product_id: data.productId || null, vendor_item_code: data.itemCode, description: data.description, unit_price: data.unitPrice, currency: "PHP", minimum_order_quantity: data.moq, lead_time_days: data.leadTimeDays, delivery_window_days: data.deliveryWindowDays, packaging_specs: data.packagingSpecs || null, status: "active" });
  if (error) go(error.message, "error", data.supplierId);
  refresh();
  go("Catalog item added.", "success", data.supplierId);
}

export async function addPurchaseOrderLine(formData: FormData) {
  const result = z.object({ organizationId: id, supplierId: id, purchaseOrderId: id, productId: z.string(), description: z.string().trim().min(2).max(500), quantity: z.coerce.number().positive(), unitPrice: z.coerce.number().min(0), taxRate: z.coerce.number().min(0).max(100), promisedDate: z.string() }).safeParse(Object.fromEntries(formData));
  if (!result.success) go(result.error.issues[0]?.message ?? "Check the PO line.", "error");
  const data = result.data;
  const { supabase } = await requireVendorManager(data.organizationId);
  const lines = await supabase.from("procurement_record_lines").select("line_number").eq("procurement_record_id", data.purchaseOrderId).order("line_number", { ascending: false }).limit(1);
  const { error } = await supabase.from("procurement_record_lines").insert({ organization_id: data.organizationId, procurement_record_id: data.purchaseOrderId, product_id: data.productId || null, line_number: (lines.data?.[0]?.line_number ?? 0) + 1, description: data.description, quantity: data.quantity, unit_price: data.unitPrice, tax_rate: data.taxRate, promised_date: data.promisedDate || null });
  if (error) go(error.message, "error", data.supplierId);
  const allLines = await supabase.from("procurement_record_lines").select("quantity,unit_price,tax_rate").eq("procurement_record_id", data.purchaseOrderId);
  const total = (allLines.data ?? []).reduce((sum, line) => sum + Number(line.quantity) * Number(line.unit_price) * (1 + Number(line.tax_rate) / 100), 0);
  await supabase.from("procurement_records").update({ amount: total, currency: "PHP" }).eq("id", data.purchaseOrderId).eq("organization_id", data.organizationId);
  refresh();
  go("Purchase order line added.", "success", data.supplierId);
}

export async function issuePurchaseOrder(formData: FormData) {
  const result = z.object({ organizationId: id, supplierId: id, purchaseOrderId: id }).safeParse(Object.fromEntries(formData));
  if (!result.success) go("Invalid purchase order.", "error");
  const data = result.data;
  const { supabase, user } = await requireVendorManager(data.organizationId);
  const current = await supabase.from("procurement_records").select("status,reference").eq("id", data.purchaseOrderId).eq("supplier_id", data.supplierId).single();
  if (current.error) go(current.error.message, "error", data.supplierId);
  const { error } = await supabase.from("procurement_records").update({ status: "sent" }).eq("id", data.purchaseOrderId).eq("organization_id", data.organizationId);
  if (error) go(error.message, "error", data.supplierId);
  await Promise.all([
    supabase.from("workflow_events").insert({ organization_id: data.organizationId, supplier_id: data.supplierId, entity_type: "purchase_order", entity_id: data.purchaseOrderId, from_status: current.data.status, to_status: "sent", actor_id: user.id }),
    supabase.from("notifications").insert({ organization_id: data.organizationId, supplier_id: data.supplierId, audience: "vendor", title: `New purchase order ${current.data.reference}`, message: "Review and acknowledge this purchase order.", href: "/vendor/orders" }),
  ]);
  refresh();
  go("Purchase order issued to the vendor.", "success", data.supplierId);
}

export async function generateReorderRequisitions(formData: FormData) {
  const organizationId = id.safeParse(formData.get("organizationId"));
  if (!organizationId.success) go("Invalid organization.", "error");
  const { supabase } = await requireVendorManager(organizationId.data);
  const { data, error } = await supabase.rpc("generate_reorder_requisitions", { target_organization_id: organizationId.data });
  if (error) go(error.message, "error");
  refresh();
  go(`${data} replenishment requisition${data === 1 ? "" : "s"} generated.`);
}

export async function recordGoodsReceipt(formData: FormData) {
  const result = z.object({ organizationId: id, supplierId: id, shipmentLineId: id, reference: z.string().trim().min(2).max(60), acceptedQuantity: z.coerce.number().min(0), rejectedQuantity: z.coerce.number().min(0), qualityOk: z.string().optional(), conditionOk: z.string().optional(), packagingOk: z.string().optional(), rejectionReason: z.string().trim().max(1000) }).refine((value) => value.acceptedQuantity + value.rejectedQuantity > 0, { message: "Enter an accepted or rejected quantity." }).safeParse(Object.fromEntries(formData));
  if (!result.success) go(result.error.issues[0]?.message ?? "Check the receipt.", "error");
  const data = result.data;
  const { supabase } = await requireVendorManager(data.organizationId);
  const { error } = await supabase.rpc("record_goods_receipt", { target_organization_id: data.organizationId, target_shipment_line_id: data.shipmentLineId, target_accepted_quantity: data.acceptedQuantity, target_rejected_quantity: data.rejectedQuantity, target_reference: data.reference, target_quality_ok: data.qualityOk === "on", target_condition_ok: data.conditionOk === "on", target_packaging_ok: data.packagingOk === "on", target_rejection_reason: data.rejectionReason || null });
  if (error) go(error.message, "error", data.supplierId);
  refresh();
  go("Goods receipt posted and accepted stock updated.", "success", data.supplierId);
}

export async function matchVendorInvoice(formData: FormData) {
  const result = z.object({ organizationId: id, supplierId: id, invoiceId: id }).safeParse(Object.fromEntries(formData));
  if (!result.success) go("Invalid invoice.", "error");
  const data = result.data;
  const { supabase, user } = await requireVendorManager(data.organizationId);
  const invoice = await supabase.from("vendor_invoices").select("purchase_order_id,total_amount").eq("id", data.invoiceId).eq("supplier_id", data.supplierId).single();
  if (invoice.error) go(invoice.error.message, "error", data.supplierId);
  const [po, lines] = await Promise.all([
    supabase.from("procurement_records").select("amount").eq("id", invoice.data.purchase_order_id).single(),
    supabase.from("procurement_record_lines").select("quantity,received_quantity,unit_price,tax_rate").eq("procurement_record_id", invoice.data.purchase_order_id),
  ]);
  if (po.error || lines.error) go(po.error?.message ?? lines.error?.message ?? "Matching data is unavailable.", "error", data.supplierId);
  const poAmount = Number(po.data.amount ?? 0);
  const receivedAmount = (lines.data ?? []).reduce((sum, line) => sum + Number(line.received_quantity) * Number(line.unit_price) * (1 + Number(line.tax_rate) / 100), 0);
  const invoiceAmount = Number(invoice.data.total_amount);
  const priceVariance = invoiceAmount - poAmount;
  const quantityVariance = (lines.data ?? []).reduce((sum, line) => sum + Number(line.quantity) - Number(line.received_quantity), 0);
  const matched = Math.abs(priceVariance) <= 0.01 && Math.abs(invoiceAmount - receivedAmount) <= 0.01 && quantityVariance <= 0;
  const resultStatus = matched ? "matched" : "exception";
  const match = await supabase.from("invoice_matches").insert({ organization_id: data.organizationId, invoice_id: data.invoiceId, purchase_order_amount: poAmount, received_amount: receivedAmount, invoice_amount: invoiceAmount, price_variance: priceVariance, quantity_variance: quantityVariance, result: resultStatus, details: { price_ok: Math.abs(priceVariance) <= 0.01, receipt_ok: Math.abs(invoiceAmount - receivedAmount) <= 0.01 }, matched_by: user.id });
  if (match.error) go(match.error.message, "error", data.supplierId);
  await supabase.from("vendor_invoices").update({ status: matched ? "approved" : "exception", mismatch_reason: matched ? null : "PO, received quantity, and invoice totals do not match.", approved_by: matched ? user.id : null, approved_at: matched ? new Date().toISOString() : null }).eq("id", data.invoiceId);
  refresh();
  go(matched ? "Invoice passed three-way matching." : "Invoice exception created for review.", "success", data.supplierId);
}

export async function recordVendorPayment(formData: FormData) {
  const result = z.object({ organizationId: id, supplierId: id, invoiceId: id, reference: z.string().trim().min(2).max(80), amount: z.coerce.number().positive(), paymentMethod: z.string().trim().max(80), status: z.enum(["pending", "approved", "scheduled", "paid"]) }).safeParse(Object.fromEntries(formData));
  if (!result.success) go(result.error.issues[0]?.message ?? "Check the payment.", "error");
  const data = result.data;
  const { supabase, user } = await requireVendorManager(data.organizationId);
  const { error } = await supabase.from("payment_records").insert({ organization_id: data.organizationId, supplier_id: data.supplierId, invoice_id: data.invoiceId, reference: data.reference, amount: data.amount, currency: "PHP", payment_method: data.paymentMethod || null, status: data.status, paid_at: data.status === "paid" ? new Date().toISOString() : null, recorded_by: user.id });
  if (error) go(error.message, "error", data.supplierId);
  if (data.status === "paid") await supabase.from("vendor_invoices").update({ status: "paid" }).eq("id", data.invoiceId);
  await supabase.from("notifications").insert({ organization_id: data.organizationId, supplier_id: data.supplierId, audience: "vendor", title: `Payment ${data.status}`, message: `${data.reference} was recorded for PHP ${data.amount.toFixed(2)}.`, href: "/vendor/invoices" });
  refresh();
  go("Payment record saved.", "success", data.supplierId);
}

export async function calculateVendorPerformance(formData: FormData) {
  const result = z.object({ organizationId: id, supplierId: id }).safeParse(Object.fromEntries(formData));
  if (!result.success) go("Invalid vendor.", "error");
  const data = result.data;
  const { supabase, user } = await requireVendorManager(data.organizationId);
  const start = new Date(); start.setDate(start.getDate() - 90);
  const [orders, shipments, returns, acknowledgements, invoices] = await Promise.all([
    supabase.from("procurement_records").select("id,status,created_at").eq("organization_id", data.organizationId).eq("supplier_id", data.supplierId).eq("record_type", "purchase_order").gte("created_at", start.toISOString()),
    supabase.from("shipments").select("due_at,actual_arrival_at,status").eq("organization_id", data.organizationId).eq("supplier_id", data.supplierId).gte("created_at", start.toISOString()),
    supabase.from("vendor_return_requests").select("id").eq("organization_id", data.organizationId).eq("supplier_id", data.supplierId).gte("created_at", start.toISOString()),
    supabase.from("purchase_order_acknowledgements").select("responded_at,purchase_order_id").eq("organization_id", data.organizationId).eq("supplier_id", data.supplierId).gte("responded_at", start.toISOString()),
    supabase.from("vendor_invoices").select("status").eq("organization_id", data.organizationId).eq("supplier_id", data.supplierId).gte("created_at", start.toISOString()),
  ]);
  const shipmentRows = shipments.data ?? [];
  const delivered = shipmentRows.filter((shipment) => shipment.actual_arrival_at);
  const onTime = delivered.filter((shipment) => !shipment.due_at || new Date(shipment.actual_arrival_at!) <= new Date(shipment.due_at)).length;
  const orderCount = orders.data?.length ?? 0;
  const onTimeRate = delivered.length ? onTime / delivered.length * 100 : 0;
  const fulfillmentRate = orderCount ? (orders.data ?? []).filter((order) => ["received", "completed", "closed"].includes(order.status)).length / orderCount * 100 : 0;
  const qualityScore = delivered.length ? Math.max(0, 100 - ((returns.data?.length ?? 0) / delivered.length * 100)) : 0;
  const invoiceRows = invoices.data ?? [];
  const accurateInvoices = invoiceRows.filter((invoice) => !["exception", "rejected"].includes(invoice.status)).length;
  const accuracyScore = invoiceRows.length ? accurateInvoices / invoiceRows.length * 100 : qualityScore;
  const orderCreatedAt = new Map((orders.data ?? []).map((order) => [order.id, new Date(order.created_at).getTime()]));
  const responseDurations = (acknowledgements.data ?? []).flatMap((acknowledgement) => {
    const issuedAt = orderCreatedAt.get(acknowledgement.purchase_order_id);
    return issuedAt ? [(new Date(acknowledgement.responded_at).getTime() - issuedAt) / 3_600_000] : [];
  });
  const responseHours = responseDurations.length ? responseDurations.reduce((sum, hours) => sum + Math.max(0, hours), 0) / responseDurations.length : 0;
  const overall = onTimeRate * .3 + fulfillmentRate * .3 + qualityScore * .2 + accuracyScore * .15 + Math.max(0, 100 - responseHours) * .05;
  const snapshot = await supabase.from("vendor_performance_snapshots").upsert({ organization_id: data.organizationId, supplier_id: data.supplierId, period_start: start.toISOString().slice(0, 10), period_end: new Date().toISOString().slice(0, 10), on_time_delivery_rate: onTimeRate, fulfillment_rate: fulfillmentRate, quality_score: qualityScore, accuracy_score: accuracyScore, response_time_hours: responseHours, overall_score: overall, order_count: orderCount, calculated_by: user.id }, { onConflict: "organization_id,supplier_id,period_start,period_end" });
  if (snapshot.error) go(snapshot.error.message, "error", data.supplierId);
  refresh();
  go("Vendor scorecard recalculated.", "success", data.supplierId);
}

export async function addVendorReview(formData: FormData) {
  const result = z.object({ organizationId: id, supplierId: id, action: z.enum(["preferred", "renew", "coaching", "warning", "improvement_plan", "suspend", "deactivate"]), summary: z.string().trim().min(5).max(4000), nextReviewDate: z.string() }).safeParse(Object.fromEntries(formData));
  if (!result.success) go(result.error.issues[0]?.message ?? "Check the review.", "error");
  const data = result.data;
  const { supabase, user } = await requireVendorManager(data.organizationId);
  const { error } = await supabase.from("vendor_reviews").insert({ organization_id: data.organizationId, supplier_id: data.supplierId, action: data.action, summary: data.summary, next_review_date: data.nextReviewDate || null, created_by: user.id });
  if (error) go(error.message, "error", data.supplierId);
  if (data.action === "suspend" || data.action === "deactivate") await supabase.from("suppliers").update({ status: "inactive", onboarding_status: data.action === "suspend" ? "suspended" : "archived" }).eq("id", data.supplierId);
  refresh();
  go("Vendor lifecycle review recorded.", "success", data.supplierId);
}

export async function addVendorImprovementPlan(formData: FormData) {
  const result = z.object({
    organizationId: id,
    supplierId: id,
    title: z.string().trim().min(3).max(160),
    objectives: z.string().trim().min(5).max(4000),
    dueDate: z.string().date(),
  }).safeParse(Object.fromEntries(formData));
  if (!result.success) go(result.error.issues[0]?.message ?? "Check the improvement plan.", "error");
  const data = result.data;
  const { supabase, user } = await requireVendorManager(data.organizationId);
  const { error } = await supabase.from("vendor_improvement_plans").insert({
    organization_id: data.organizationId,
    supplier_id: data.supplierId,
    title: data.title,
    objectives: data.objectives,
    due_date: data.dueDate,
    status: "open",
    owner_id: user.id,
  });
  if (error) go(error.message, "error", data.supplierId);
  await supabase.from("notifications").insert({
    organization_id: data.organizationId,
    supplier_id: data.supplierId,
    audience: "vendor",
    title: `Improvement plan: ${data.title}`,
    message: `Review the objectives and due date ${data.dueDate}.`,
    href: "/vendor/performance",
  });
  refresh();
  go("Vendor improvement plan created.", "success", data.supplierId);
}
