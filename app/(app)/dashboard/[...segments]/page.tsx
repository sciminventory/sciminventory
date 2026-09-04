import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ModulePage, type ModuleOption, type OperationalItem } from "@/components/operations/module-page";
import { getModuleFromSegments, type OperationalModule } from "@/lib/operations/modules";
import { canManageOperationalModule, canViewOperationalModule } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Operations" };

type Search = { success?: string; error?: string; q?: string; create?: string };

export default async function OperationalModulePage({ params, searchParams }: { params: Promise<{ segments: string[] }>; searchParams: Promise<Search> }) {
  const [{ segments }, search] = await Promise.all([params, searchParams]);
  const config = getModuleFromSegments(segments);
  if (!config) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership } = await supabase.from("organization_memberships").select("organization_id, role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!membership) redirect("/login?message=Your%20account%20does%20not%20have%20an%20active%20workspace.");
  if (!canViewOperationalModule(config.key, membership.role)) notFound();

  const organizationId = membership.organization_id;
  const [warehouseResult, productResult, supplierResult] = await Promise.all([
    supabase.from("warehouses").select("id, code, name").eq("organization_id", organizationId).eq("is_active", true).order("code"),
    supabase.from("products").select("id, sku, name").eq("organization_id", organizationId).eq("is_active", true).order("sku"),
    supabase.from("suppliers").select("id, code, name").eq("organization_id", organizationId).eq("status", "active").order("code"),
  ]);
  const setupError = productResult.error || supplierResult.error
    ? "Operational modules require a database update. Ask a system administrator to apply migration 003, then refresh this page."
    : undefined;
  const warehouses: ModuleOption[] = (warehouseResult.data ?? []).map((row) => ({ id: row.id, code: row.code, name: row.name }));
  const products: ModuleOption[] = (productResult.data ?? []).map((row) => ({ id: row.id, code: row.sku, name: row.name }));
  const suppliers: ModuleOption[] = (supplierResult.data ?? []).map((row) => ({ id: row.id, code: row.code, name: row.name }));
  const items = setupError ? [] : await loadItems(supabase, config.key, organizationId, warehouses, products, suppliers);

  return <ModulePage config={config} organizationId={organizationId} role={membership.role} items={items} warehouses={warehouses} products={products} suppliers={suppliers} canManage={canManageOperationalModule(config.key, membership.role)} success={search.success} error={search.error} setupError={setupError} query={search.q} openCreate={search.create === "1"} />;
}

type Client = Awaited<ReturnType<typeof createClient>>;

async function loadItems(supabase: Client, module: OperationalModule, organizationId: string, warehouses: ModuleOption[], products: ModuleOption[], suppliers: ModuleOption[]): Promise<OperationalItem[]> {
  const warehouseNames = new Map(warehouses.map((row) => [row.id, `${row.code} · ${row.name}`]));
  const productNames = new Map(products.map((row) => [row.id, `${row.code} · ${row.name}`]));
  const supplierNames = new Map(suppliers.map((row) => [row.id, `${row.code} · ${row.name}`]));

  if (module === "products") {
    const { data } = await supabase.from("products").select("id, sku, name, category, unit_of_measure, reorder_point, is_active, created_at").eq("organization_id", organizationId).order("created_at", { ascending: false });
    return (data ?? []).map((row) => item(row.id, row.sku, row.name, [row.category, row.unit_of_measure].filter(Boolean).join(" · "), row.is_active ? "active" : "inactive", row.reorder_point, null, row.created_at, null));
  }
  if (module === "suppliers") {
    const { data } = await supabase.from("suppliers").select("id, code, name, contact_email, phone, status, lead_time_days, created_at").eq("organization_id", organizationId).order("created_at", { ascending: false });
    return (data ?? []).map((row) => item(row.id, row.code, row.name, [row.contact_email, row.phone].filter(Boolean).join(" · "), row.status, row.lead_time_days, null, row.created_at, null));
  }
  if (module === "locations") {
    const { data } = await supabase.from("warehouse_locations").select("id, warehouse_id, code, name, location_type, is_active, created_at").eq("organization_id", organizationId).order("created_at", { ascending: false });
    return (data ?? []).map((row) => item(row.id, row.code, row.name, row.is_active ? "Active location" : "Inactive location", row.location_type, null, null, row.created_at, warehouseNames.get(row.warehouse_id) ?? null));
  }
  if (module === "stock") {
    const { data } = await supabase.from("inventory_balances").select("id, warehouse_id, product_id, on_hand, reserved, updated_at").eq("organization_id", organizationId).order("updated_at", { ascending: false });
    return (data ?? []).map((row) => {
      const available = Number(row.on_hand) - Number(row.reserved);
      return item(row.id, products.find((product) => product.id === row.product_id)?.code ?? "UNKNOWN", productNames.get(row.product_id) ?? "Unknown product", `On hand ${formatNumber(row.on_hand)} · Reserved ${formatNumber(row.reserved)}`, available <= 0 ? "out_of_stock" : "available", available, null, row.updated_at, warehouseNames.get(row.warehouse_id) ?? null, true);
    });
  }
  if (module === "movements") {
    const { data } = await supabase.from("inventory_movements").select("id, warehouse_id, product_id, movement_type, quantity, reference, notes, occurred_at").eq("organization_id", organizationId).order("occurred_at", { ascending: false }).limit(250);
    return (data ?? []).map((row) => item(row.id, row.reference, productNames.get(row.product_id) ?? "Unknown product", row.notes ?? "Immutable stock ledger entry", row.movement_type, row.quantity, null, row.occurred_at, warehouseNames.get(row.warehouse_id) ?? null, true));
  }
  if (module === "transfers" || module === "cycle_counts") {
    const operationType = module === "transfers" ? "transfer" : "cycle_count";
    const { data } = await supabase.from("inventory_operations").select("id, reference, title, source_warehouse_id, destination_warehouse_id, status, quantity, due_at, notes, created_at").eq("organization_id", organizationId).eq("operation_type", operationType).order("created_at", { ascending: false });
    return (data ?? []).map((row) => item(row.id, row.reference, row.title, row.notes ?? (row.destination_warehouse_id ? `To ${warehouseNames.get(row.destination_warehouse_id) ?? "destination"}` : "Count work"), row.status, row.quantity, row.due_at, row.created_at, row.source_warehouse_id ? warehouseNames.get(row.source_warehouse_id) ?? null : null));
  }
  if (["receiving", "putaway", "picking"].includes(module)) {
    const { data } = await supabase.from("warehouse_tasks").select("id, warehouse_id, reference, title, status, quantity, due_at, notes, created_at").eq("organization_id", organizationId).eq("task_type", module as "receiving" | "putaway" | "picking").order("created_at", { ascending: false });
    return (data ?? []).map((row) => item(row.id, row.reference, row.title, row.notes ?? "Warehouse execution task", row.status, row.quantity, row.due_at, row.created_at, warehouseNames.get(row.warehouse_id) ?? null));
  }
  if (["requisitions", "rfqs", "quotations", "purchase_orders"].includes(module)) {
    const types = { requisitions: "requisition", rfqs: "rfq", quotations: "quotation", purchase_orders: "purchase_order" } as const;
    const { data } = await supabase.from("procurement_records").select("id, reference, title, supplier_id, warehouse_id, status, amount, currency, due_at, notes, created_at").eq("organization_id", organizationId).eq("record_type", types[module as keyof typeof types]).order("created_at", { ascending: false });
    return (data ?? []).map((row) => item(row.id, row.reference, row.title, row.notes ?? (row.supplier_id ? supplierNames.get(row.supplier_id) ?? "Supplier" : "Internal request"), row.status, row.amount, row.due_at, row.created_at, row.warehouse_id ? warehouseNames.get(row.warehouse_id) ?? null : null));
  }
  if (module === "logistics") {
    const { data } = await supabase.from("shipments").select("id, reference, title, carrier, tracking_number, warehouse_id, status, due_at, notes, created_at").eq("organization_id", organizationId).order("created_at", { ascending: false });
    return (data ?? []).map((row) => item(row.id, row.reference, row.title, [row.carrier, row.tracking_number, row.notes].filter(Boolean).join(" · "), row.status, null, row.due_at, row.created_at, row.warehouse_id ? warehouseNames.get(row.warehouse_id) ?? null : null));
  }
  const { data } = await supabase.from("documents").select("id, reference, title, document_type, file_name, file_size, status, created_at").eq("organization_id", organizationId).order("created_at", { ascending: false });
  return (data ?? []).map((row) => item(row.id, row.reference, row.title, [row.document_type, row.file_name].filter(Boolean).join(" · "), row.status, row.file_size, null, row.created_at, null));
}

function item(id: string, reference: string, title: string, detail: string, status: string, quantity: number | null, dueAt: string | null, createdAt: string, warehouse: string | null, immutable = false): OperationalItem {
  return { id, reference, title, detail, status, quantity: quantity === null ? null : Number(quantity), dueAt, createdAt, warehouse, immutable };
}

function formatNumber(value: number) { return new Intl.NumberFormat("en", { maximumFractionDigits: 4 }).format(Number(value)); }
