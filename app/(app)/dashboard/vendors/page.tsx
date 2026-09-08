import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VendorManagementConsole } from "@/components/operations/vendor-management-console";
import { hasPermission } from "@/lib/auth/permissions";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Vendor management" };

export default async function VendorsPage({ searchParams }: { searchParams: Promise<{ vendor?: string; success?: string; error?: string }> }) {
  if (!hasSupabaseEnv()) return <VendorManagementConsole preview />;
  const search = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const membership = await supabase.from("organization_memberships").select("organization_id,role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!membership.data || !hasPermission(membership.data.role, "vendors.read")) redirect("/dashboard");
  const organizationId = membership.data.organization_id;

  const [organization, vendors, users, contacts, addresses, shippingRules, documents, catalog, orders, orderLines, shipments, shipmentLines, invoices, payments, performance, reviews, improvements, products, warehouses] = await Promise.all([
    supabase.from("organizations").select("slug").eq("id", organizationId).single(),
    supabase.from("suppliers").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    supabase.from("vendor_users").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    supabase.from("vendor_contacts").select("*").eq("organization_id", organizationId).order("is_primary", { ascending: false }),
    supabase.from("vendor_addresses").select("*").eq("organization_id", organizationId).order("is_primary", { ascending: false }),
    supabase.from("vendor_shipping_rules").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    supabase.from("vendor_documents").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    supabase.from("vendor_catalog_items").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    supabase.from("procurement_records").select("*").eq("organization_id", organizationId).eq("record_type", "purchase_order").order("created_at", { ascending: false }),
    supabase.from("procurement_record_lines").select("*").eq("organization_id", organizationId).order("line_number"),
    supabase.from("shipments").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    supabase.from("shipment_lines").select("*").eq("organization_id", organizationId).order("created_at"),
    supabase.from("vendor_invoices").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    supabase.from("payment_records").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    supabase.from("vendor_performance_snapshots").select("*").eq("organization_id", organizationId).order("period_end", { ascending: false }),
    supabase.from("vendor_reviews").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    supabase.from("vendor_improvement_plans").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    supabase.from("products").select("id,sku,name").eq("organization_id", organizationId).eq("is_active", true).order("sku"),
    supabase.from("warehouses").select("id,code,name").eq("organization_id", organizationId).eq("is_active", true).order("code"),
  ]);
  const setupError = [vendors, users, contacts, addresses, shippingRules, documents, catalog, orders, orderLines, shipments, shipmentLines, invoices, payments, performance, reviews, improvements].find((result) => result.error)?.error?.message;
  const securedPaths = [...(documents.data ?? []).map((document) => document.storage_path), ...(invoices.data ?? []).flatMap((invoice) => invoice.storage_path ? [invoice.storage_path] : [])];
  const signedFiles = securedPaths.length ? await supabase.storage.from("organization-documents").createSignedUrls(securedPaths, 600) : { data: [], error: null };
  const fileUrls = Object.fromEntries((signedFiles.data ?? []).filter((file) => file.signedUrl).map((file) => [file.path, file.signedUrl]));

  return <VendorManagementConsole
    organizationId={organizationId}
    organizationSlug={organization.data?.slug}
    role={membership.data.role}
    selectedVendorId={search.vendor}
    success={search.success}
    error={search.error}
    setupError={setupError}
    vendors={vendors.data ?? []}
    vendorUsers={users.data ?? []}
    contacts={contacts.data ?? []}
    addresses={addresses.data ?? []}
    shippingRules={shippingRules.data ?? []}
    documents={documents.data ?? []}
    catalog={catalog.data ?? []}
    orders={orders.data ?? []}
    orderLines={orderLines.data ?? []}
    shipments={shipments.data ?? []}
    shipmentLines={shipmentLines.data ?? []}
    invoices={invoices.data ?? []}
    payments={payments.data ?? []}
    performance={performance.data ?? []}
    reviews={reviews.data ?? []}
    improvements={improvements.data ?? []}
    fileUrls={fileUrls}
    products={products.data ?? []}
    warehouses={warehouses.data ?? []}
  />;
}
