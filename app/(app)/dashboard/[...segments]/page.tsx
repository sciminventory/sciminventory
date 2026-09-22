import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ModulePage, type ModuleOption, type OperationalItem } from "@/components/operations/module-page";
import { getModuleFromSegments, type OperationalModule } from "@/lib/operations/modules";
import { canManageOperationalModule, canViewOperationalModule } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { createOperationalReference } from "@/lib/operations/references";

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
  const [warehouseResult, productResult, supplierResult, locationResult, locationInventoryCheck, productEntryCheck, purchaseOrderCheck] = await Promise.all([
    supabase.from("warehouses").select("id, code, name").eq("organization_id", organizationId).eq("is_active", true).order("code"),
    supabase.from("products").select("id, sku, name").eq("organization_id", organizationId).eq("is_active", true).order("sku"),
    supabase.from("suppliers").select("id, code, name").eq("organization_id", organizationId).eq("status", "active").order("code"),
    supabase.from("warehouse_locations").select("id, warehouse_id, code, name").eq("organization_id", organizationId).eq("is_active", true).order("code"),
    ["products", "locations", "stock", "movements"].includes(config.key)
      ? supabase.from("inventory_balances").select("location_id").eq("organization_id", organizationId).limit(1)
      : Promise.resolve({ data: [], error: null }),
    config.key === "products"
      ? supabase.from("products").select("unit_price, default_supplier_id, default_warehouse_id, default_location_id, expiry_date").eq("organization_id", organizationId).limit(1)
      : Promise.resolve({ data: [], error: null }),
    config.key === "purchase_orders"
      ? supabase.from("procurement_records").select("order_date").eq("organization_id", organizationId).limit(1)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const setupError = purchaseOrderCheck.error
    ? "The purchase order interface requires database migration 020. Apply it in the database SQL editor, then refresh this page."
    : productEntryCheck.error
    ? "Product inventory entry requires database migration 019. Apply it in the database SQL editor, then refresh this page."
    : locationInventoryCheck.error
    ? "Location inventory requires database migration 018. Apply it in the database SQL editor, then refresh this page."
    : productResult.error || supplierResult.error || locationResult.error
    ? "Operational modules require a database update. Ask a system administrator to apply migration 003, then refresh this page."
    : undefined;
  const warehouses: ModuleOption[] = (warehouseResult.data ?? []).map((row) => ({ id: row.id, code: row.code, name: row.name }));
  const products: ModuleOption[] = (productResult.data ?? []).map((row) => ({ id: row.id, code: row.sku, name: row.name }));
  const suppliers: ModuleOption[] = (supplierResult.data ?? []).map((row) => ({ id: row.id, code: row.code, name: row.name }));
  const warehouseNameById = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.name]));
  const locations: ModuleOption[] = (locationResult.data ?? []).map((row) => ({ id: row.id, code: row.code, name: `${warehouseNameById.get(row.warehouse_id) ?? "Warehouse"} · ${row.name}`, warehouseId: row.warehouse_id }));
  const items = setupError ? [] : await loadItems(supabase, config.key, organizationId, warehouses, products, suppliers, locations);

  return <ModulePage config={config} organizationId={organizationId} role={membership.role} items={items} warehouses={warehouses} products={products} suppliers={suppliers} locations={locations} createReference={createOperationalReference(config.key)} canManage={canManageOperationalModule(config.key, membership.role)} success={search.success} error={search.error} setupError={setupError} query={search.q} openCreate={search.create === "1"} />;
}

type Client = Awaited<ReturnType<typeof createClient>>;

async function loadItems(supabase: Client, module: OperationalModule, organizationId: string, warehouses: ModuleOption[], products: ModuleOption[], suppliers: ModuleOption[], locations: ModuleOption[]): Promise<OperationalItem[]> {
  const warehouseNames = new Map(warehouses.map((row) => [row.id, `${row.code} · ${row.name}`]));
  const productNames = new Map(products.map((row) => [row.id, `${row.code} · ${row.name}`]));
  const supplierNames = new Map(suppliers.map((row) => [row.id, `${row.code} · ${row.name}`]));
  const locationNames = new Map(locations.map((row) => [row.id, `${row.code} · ${row.name}`]));

  if (module === "products") {
    const [{ data }, { data: balances }] = await Promise.all([
      supabase.from("products").select("id, sku, name, category, unit_of_measure, reorder_point, unit_price, default_supplier_id, default_warehouse_id, default_location_id, expiry_date, is_active, created_at").eq("organization_id", organizationId).eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("inventory_balances").select("product_id, on_hand").eq("organization_id", organizationId),
    ]);
    const quantityByProduct = new Map<string, number>();
    for (const balance of balances ?? []) {
      quantityByProduct.set(balance.product_id, (quantityByProduct.get(balance.product_id) ?? 0) + Number(balance.on_hand));
    }
    return (data ?? []).map((row) => ({
      ...item(
        row.id,
        row.sku,
        row.name,
        [row.category, row.unit_of_measure, `₱${Number(row.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`].filter(Boolean).join(" · "),
        row.is_active ? "active" : "inactive",
        quantityByProduct.get(row.id) ?? 0,
        row.expiry_date,
        row.created_at,
        row.default_location_id ? locationNames.get(row.default_location_id) ?? warehouseNames.get(row.default_warehouse_id ?? "") ?? null : row.default_warehouse_id ? warehouseNames.get(row.default_warehouse_id) ?? null : null,
      ),
      editDetail: row.category ?? "",
      reorderLevel: Number(row.reorder_point),
      unitPrice: Number(row.unit_price),
      supplierId: row.default_supplier_id,
      warehouseId: row.default_warehouse_id,
      locationId: row.default_location_id,
      expiryDate: row.expiry_date,
    }));
  }
  if (module === "suppliers") {
    const { data } = await supabase.from("suppliers").select("id, code, name, contact_email, phone, status, lead_time_days, created_at").eq("organization_id", organizationId).order("created_at", { ascending: false });
    return (data ?? []).map((row) => ({ ...item(row.id, row.code, row.name, [row.contact_email, row.phone].filter(Boolean).join(" · "), row.status, row.lead_time_days, null, row.created_at, null), editDetail: row.contact_email ?? "" }));
  }
  if (module === "locations") {
    const [{ data }, { data: balances }] = await Promise.all([
      supabase.from("warehouse_locations").select("id, warehouse_id, code, name, location_type, is_active, created_at").eq("organization_id", organizationId).order("created_at", { ascending: false }),
      supabase.from("inventory_balances").select("location_id, on_hand").eq("organization_id", organizationId),
    ]);
    const quantityByLocation = new Map<string, number>();
    for (const balance of balances ?? []) {
      if (balance.location_id) quantityByLocation.set(balance.location_id, (quantityByLocation.get(balance.location_id) ?? 0) + Number(balance.on_hand));
    }
    return (data ?? []).map((row) => ({ ...item(row.id, row.code, row.name, row.is_active ? "Active location" : "Inactive location", row.location_type, quantityByLocation.get(row.id) ?? 0, null, row.created_at, warehouseNames.get(row.warehouse_id) ?? null), warehouseId: row.warehouse_id }));
  }
  if (module === "stock") {
    const { data } = await supabase.from("inventory_balances").select("id, warehouse_id, location_id, product_id, on_hand, reserved, updated_at").eq("organization_id", organizationId).order("updated_at", { ascending: false });
    return (data ?? []).map((row) => {
      const available = Number(row.on_hand) - Number(row.reserved);
      return item(row.id, products.find((product) => product.id === row.product_id)?.code ?? "UNKNOWN", productNames.get(row.product_id) ?? "Unknown product", `On hand ${formatNumber(row.on_hand)} · Reserved ${formatNumber(row.reserved)}`, available <= 0 ? "out_of_stock" : "available", available, null, row.updated_at, row.location_id ? locationNames.get(row.location_id) ?? warehouseNames.get(row.warehouse_id) ?? null : `${warehouseNames.get(row.warehouse_id) ?? "Warehouse"} · Unallocated`, true);
    });
  }
  if (module === "movements") {
    const { data } = await supabase.from("inventory_movements").select("id, warehouse_id, location_id, product_id, movement_type, quantity, reference, notes, occurred_at").eq("organization_id", organizationId).order("occurred_at", { ascending: false }).limit(250);
    return (data ?? []).map((row) => item(row.id, row.reference, productNames.get(row.product_id) ?? "Unknown product", row.notes ?? "Immutable stock ledger entry", row.movement_type, row.quantity, null, row.occurred_at, row.location_id ? locationNames.get(row.location_id) ?? warehouseNames.get(row.warehouse_id) ?? null : `${warehouseNames.get(row.warehouse_id) ?? "Warehouse"} · Unallocated`, true));
  }
  if (module === "transfers" || module === "cycle_counts") {
    const operationType = module === "transfers" ? "transfer" : "cycle_count";
    const { data } = await supabase.from("inventory_operations").select("id, reference, title, source_warehouse_id, destination_warehouse_id, status, quantity, due_at, notes, created_at").eq("organization_id", organizationId).eq("operation_type", operationType).order("created_at", { ascending: false });
    return (data ?? []).map((row) => ({ ...item(row.id, row.reference, row.title, row.notes ?? (row.destination_warehouse_id ? `To ${warehouseNames.get(row.destination_warehouse_id) ?? "destination"}` : "Count work"), row.status, row.quantity, row.due_at, row.created_at, row.source_warehouse_id ? warehouseNames.get(row.source_warehouse_id) ?? null : null), warehouseId: row.source_warehouse_id, destinationWarehouseId: row.destination_warehouse_id }));
  }
  if (["receiving", "putaway", "picking"].includes(module)) {
    const { data } = await supabase.from("warehouse_tasks").select("id, warehouse_id, reference, title, status, quantity, due_at, notes, created_at").eq("organization_id", organizationId).eq("task_type", module as "receiving" | "putaway" | "picking").order("created_at", { ascending: false });
    return (data ?? []).map((row) => ({ ...item(row.id, row.reference, row.title, row.notes ?? "Warehouse execution task", row.status, row.quantity, row.due_at, row.created_at, warehouseNames.get(row.warehouse_id) ?? null), warehouseId: row.warehouse_id }));
  }
  if (["requisitions", "rfqs", "quotations", "purchase_orders"].includes(module)) {
    const types = { requisitions: "requisition", rfqs: "rfq", quotations: "quotation", purchase_orders: "purchase_order" } as const;
    const [{ data }, { data: lines }] = await Promise.all([
      supabase.from("procurement_records").select("id, reference, title, supplier_id, warehouse_id, status, amount, currency, due_at, delivery_date, order_date, notes, created_at").eq("organization_id", organizationId).eq("record_type", types[module as keyof typeof types]).order("order_date", { ascending: false }),
      module === "purchase_orders" ? supabase.from("procurement_record_lines").select("procurement_record_id, product_id, quantity, unit_price, description, line_number").eq("organization_id", organizationId).eq("line_number", 1) : Promise.resolve({ data: [], error: null }),
    ]);
    const lineByRecord = new Map((lines ?? []).map((line) => [line.procurement_record_id, line]));
    return (data ?? []).map((row) => {
      const line = lineByRecord.get(row.id);
      return {
        ...item(row.id, row.reference, row.title, row.notes ?? (row.supplier_id ? supplierNames.get(row.supplier_id) ?? "Supplier" : "Internal request"), row.status, row.amount, row.delivery_date ?? row.due_at, row.created_at, row.warehouse_id ? warehouseNames.get(row.warehouse_id) ?? null : null),
        warehouseId: row.warehouse_id,
        relatedId: row.supplier_id,
        supplierName: row.supplier_id ? supplierNames.get(row.supplier_id) ?? null : null,
        orderDate: row.order_date,
        editDetail: row.notes ?? "",
        productId: line?.product_id ?? null,
        lineQuantity: line ? Number(line.quantity) : null,
        unitPrice: line ? Number(line.unit_price) : null,
      };
    });
  }
  if (module === "logistics") {
    const { data } = await supabase.from("shipments").select("id, reference, title, carrier, tracking_number, warehouse_id, status, due_at, notes, created_at").eq("organization_id", organizationId).order("created_at", { ascending: false });
    return (data ?? []).map((row) => ({ ...item(row.id, row.reference, row.title, [row.carrier, row.tracking_number, row.notes].filter(Boolean).join(" · "), row.status, null, row.due_at, row.created_at, row.warehouse_id ? warehouseNames.get(row.warehouse_id) ?? null : null), warehouseId: row.warehouse_id, editDetail: row.carrier ?? "" }));
  }
  const { data } = await supabase.from("documents").select("id, reference, title, document_type, file_name, file_size, status, created_at").eq("organization_id", organizationId).order("created_at", { ascending: false });
  return (data ?? []).map((row) => ({ ...item(row.id, row.reference, row.title, [row.document_type, row.file_name].filter(Boolean).join(" · "), row.status, row.file_size, null, row.created_at, null), editDetail: row.document_type }));
}

function item(id: string, reference: string, title: string, detail: string, status: string, quantity: number | null, dueAt: string | null, createdAt: string, warehouse: string | null, immutable = false): OperationalItem {
  return { id, reference, title, detail, status, quantity: quantity === null ? null : Number(quantity), dueAt, createdAt, warehouse, immutable };
}

function formatNumber(value: number) { return new Intl.NumberFormat("en", { maximumFractionDigits: 4 }).format(Number(value)); }
