import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { VendorPortal } from "@/components/vendor/vendor-portal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Vendor portal" };
const sections = ["overview", "profile", "catalog", "orders", "shipments", "invoices", "performance"] as const;

export default async function VendorPortalPage({ params, searchParams }: { params: Promise<{ section?: string[] }>; searchParams: Promise<{ success?: string; error?: string }> }) {
  const route = await params;
  const search = await searchParams;
  const section = route.section?.[0] ?? "overview";
  if (!sections.includes(section as (typeof sections)[number])) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const access = await supabase.from("vendor_users").select("organization_id,supplier_id,role,status").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!access.data) redirect("/dashboard");
  const org = access.data.organization_id;
  const vendorId = access.data.supplier_id;
  const [vendor, contacts, addresses, shippingRules, documents, catalog, orders, lines, acknowledgements, shipments, shipmentLines, shipmentEvents, invoices, invoiceLines, payments, performance, reviews, improvements, notifications] = await Promise.all([
    supabase.from("suppliers").select("*").eq("organization_id", org).eq("id", vendorId).single(),
    supabase.from("vendor_contacts").select("*").eq("supplier_id", vendorId).order("is_primary", { ascending: false }),
    supabase.from("vendor_addresses").select("*").eq("supplier_id", vendorId).order("is_primary", { ascending: false }),
    supabase.from("vendor_shipping_rules").select("*").eq("supplier_id", vendorId).order("created_at", { ascending: false }),
    supabase.from("vendor_documents").select("*").eq("supplier_id", vendorId).order("created_at", { ascending: false }),
    supabase.from("vendor_catalog_items").select("*").eq("supplier_id", vendorId).order("created_at", { ascending: false }),
    supabase.from("procurement_records").select("*").eq("supplier_id", vendorId).eq("record_type", "purchase_order").order("created_at", { ascending: false }),
    supabase.from("procurement_record_lines").select("*").eq("organization_id", org).order("line_number"),
    supabase.from("purchase_order_acknowledgements").select("*").eq("supplier_id", vendorId).order("responded_at", { ascending: false }),
    supabase.from("shipments").select("*").eq("supplier_id", vendorId).order("created_at", { ascending: false }),
    supabase.from("shipment_lines").select("*").eq("organization_id", org).order("created_at"),
    supabase.from("shipment_events").select("*").eq("organization_id", org).order("occurred_at", { ascending: false }),
    supabase.from("vendor_invoices").select("*").eq("supplier_id", vendorId).order("created_at", { ascending: false }),
    supabase.from("vendor_invoice_lines").select("*").eq("organization_id", org),
    supabase.from("payment_records").select("*").eq("supplier_id", vendorId).order("created_at", { ascending: false }),
    supabase.from("vendor_performance_snapshots").select("*").eq("supplier_id", vendorId).order("period_end", { ascending: false }),
    supabase.from("vendor_reviews").select("*").eq("supplier_id", vendorId).order("created_at", { ascending: false }),
    supabase.from("vendor_improvement_plans").select("*").eq("supplier_id", vendorId).order("created_at", { ascending: false }),
    supabase.from("notifications").select("*").eq("supplier_id", vendorId).eq("audience", "vendor").order("created_at", { ascending: false }).limit(30),
  ]);
  if (vendor.error || !vendor.data) redirect("/login");
  const setupError = [contacts, addresses, shippingRules, documents, catalog, orders, lines, acknowledgements, shipments, shipmentLines, shipmentEvents, invoices, invoiceLines, payments, performance, reviews, improvements, notifications].find((result) => result.error)?.error?.message;
  const securedPaths = [...(documents.data ?? []).map((document) => document.storage_path), ...(invoices.data ?? []).flatMap((invoice) => invoice.storage_path ? [invoice.storage_path] : [])];
  const signedFiles = securedPaths.length ? await supabase.storage.from("organization-documents").createSignedUrls(securedPaths, 600) : { data: [], error: null };
  const fileUrls = Object.fromEntries((signedFiles.data ?? []).filter((file) => file.signedUrl).map((file) => [file.path, file.signedUrl]));
  return <VendorPortal section={section as (typeof sections)[number]} success={search.success} error={search.error} setupError={setupError} access={access.data} vendor={vendor.data} contacts={contacts.data ?? []} addresses={addresses.data ?? []} shippingRules={shippingRules.data ?? []} documents={documents.data ?? []} catalog={catalog.data ?? []} orders={orders.data ?? []} orderLines={lines.data ?? []} acknowledgements={acknowledgements.data ?? []} shipments={shipments.data ?? []} shipmentLines={shipmentLines.data ?? []} shipmentEvents={shipmentEvents.data ?? []} invoices={invoices.data ?? []} invoiceLines={invoiceLines.data ?? []} payments={payments.data ?? []} performance={performance.data ?? []} reviews={reviews.data ?? []} improvements={improvements.data ?? []} notifications={notifications.data ?? []} fileUrls={fileUrls} />;
}
