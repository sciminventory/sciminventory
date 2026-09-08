import type { Metadata } from "next";
import { DashboardContent } from "@/components/operations/dashboard-content";
import { emptyDashboardData, type DashboardData, type DashboardMetric } from "@/lib/operations/dashboard-data";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { formatPhpCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Control tower" };

export default async function DashboardPage() {
  if (!hasSupabaseEnv()) {
    return <DashboardContent userName="Operations team" data={emptyDashboardData("Connect the workspace backend to display live operational analytics.")} realtime={false} />;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userName = String(user?.user_metadata.full_name ?? user?.email?.split("@")[0] ?? "Operations team").split(" ")[0];
  if (!user) return <DashboardContent userName={userName} data={emptyDashboardData()} realtime={false} />;

  const { data: membership } = await supabase.from("organization_memberships").select("organization_id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!membership) return <DashboardContent userName={userName} data={emptyDashboardData("No active organization membership was found.")} realtime={false} />;

  const organizationId = membership.organization_id;
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 90);
  const [productsResult, balancesResult, movementsResult, procurementResult, shipmentsResult, tasksResult, operationsResult, suppliersResult, warehousesResult] = await Promise.all([
    supabase.from("products").select("id, sku, name, reorder_point, is_active, created_at").eq("organization_id", organizationId),
    supabase.from("inventory_balances").select("product_id, warehouse_id, on_hand, reserved, updated_at").eq("organization_id", organizationId),
    supabase.from("inventory_movements").select("id, product_id, warehouse_id, movement_type, quantity, reference, occurred_at").eq("organization_id", organizationId).gte("occurred_at", since.toISOString()).order("occurred_at", { ascending: false }).limit(1000),
    supabase.from("procurement_records").select("id, record_type, reference, title, supplier_id, status, amount, currency, due_at, created_at").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(500),
    supabase.from("shipments").select("id, status, due_at, updated_at").eq("organization_id", organizationId),
    supabase.from("warehouse_tasks").select("id, task_type, reference, title, status, quantity, due_at, created_at").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(500),
    supabase.from("inventory_operations").select("id, operation_type, reference, title, status, created_at").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(250),
    supabase.from("suppliers").select("id, code, name").eq("organization_id", organizationId),
    supabase.from("warehouses").select("id, code, name").eq("organization_id", organizationId),
  ]);

  const setupError = [productsResult, balancesResult, movementsResult, procurementResult, shipmentsResult, tasksResult, operationsResult].find((result) => result.error)?.error;
  if (setupError) {
    return <DashboardContent userName={userName} data={emptyDashboardData("Live overview analytics require database updates 003 and 004.")} realtime={false} />;
  }

  const products = productsResult.data ?? [];
  const balances = balancesResult.data ?? [];
  const movements = movementsResult.data ?? [];
  const procurement = procurementResult.data ?? [];
  const shipments = shipmentsResult.data ?? [];
  const tasks = tasksResult.data ?? [];
  const operations = operationsResult.data ?? [];
  const suppliers = new Map((suppliersResult.data ?? []).map((supplier) => [supplier.id, supplier.name]));
  const warehouses = new Map((warehousesResult.data ?? []).map((warehouse) => [warehouse.id, `${warehouse.code} · ${warehouse.name}`]));
  const availableByProduct = new Map<string, number>();
  for (const balance of balances) {
    availableByProduct.set(balance.product_id, (availableByProduct.get(balance.product_id) ?? 0) + Number(balance.on_hand) - Number(balance.reserved));
  }

  const activeProducts = products.filter((product) => product.is_active);
  const health = { healthy: 0, low: 0, critical: 0, inactive: products.length - activeProducts.length };
  for (const product of activeProducts) {
    const available = availableByProduct.get(product.id) ?? 0;
    if (available <= 0) health.critical += 1;
    else if (available <= Number(product.reorder_point)) health.low += 1;
    else health.healthy += 1;
  }

  const purchaseOrders = procurement.filter((record) => record.record_type === "purchase_order");
  const openPurchaseOrders = purchaseOrders.filter((record) => !["completed", "cancelled", "rejected"].includes(record.status));
  const committed = openPurchaseOrders.reduce((sum, record) => sum + Number(record.amount ?? 0), 0);
  const inboundTasks = tasks.filter((task) => task.task_type === "receiving" && !["completed", "cancelled"].includes(task.status));
  const inboundUnits = inboundTasks.reduce((sum, task) => sum + Number(task.quantity ?? 0), 0);
  const stockOnHand = balances.reduce((sum, balance) => sum + Number(balance.on_hand), 0);
  const throughput = {
    "7D": bucketMovements(movements, 7, 7),
    "30D": bucketMovements(movements, 30, 15),
    "90D": bucketMovements(movements, 90, 18),
  };
  const lastSeven = movementTotal(movements, 0, 7);
  const previousSeven = movementTotal(movements, 7, 14);
  const throughputTrend = previousSeven === 0 ? (lastSeven > 0 ? 100 : 0) : ((lastSeven - previousSeven) / previousSeven) * 100;

  const delivered = shipments.filter((shipment) => shipment.status === "delivered");
  const onTime = delivered.filter((shipment) => !shipment.due_at || new Date(shipment.updated_at) <= new Date(shipment.due_at)).length;
  const late = delivered.length - onTime;
  const exceptions = shipments.filter((shipment) => shipment.status === "exception").length;
  const serviceDenominator = onTime + late + exceptions;

  const requisitionsWaiting = procurement.filter((record) => record.record_type === "requisition" && record.status === "submitted").length;
  const ordersWaiting = procurement.filter((record) => record.record_type === "purchase_order" && record.status === "submitted").length;
  const alerts: DashboardData["alerts"] = [];
  for (const product of activeProducts.filter((item) => (availableByProduct.get(item.id) ?? 0) <= Number(item.reorder_point)).slice(0, 2)) {
    const available = availableByProduct.get(product.id) ?? 0;
    alerts.push({ level: available <= 0 ? "Critical" : "Review", title: `${product.name} ${available <= 0 ? "is out of stock" : "is below its reorder point"}`, meta: `${product.sku} · ${formatQuantity(available)} available`, action: "Create requisition", href: "/dashboard/procurement/requisitions?create=1" });
  }
  const overdueOrder = openPurchaseOrders.find((record) => record.due_at && new Date(record.due_at) < new Date());
  if (overdueOrder) alerts.push({ level: "Delayed", title: `${overdueOrder.reference} is past its expected date`, meta: overdueOrder.title, action: "Open purchase orders", href: "/dashboard/procurement/purchase-orders" });
  const activeCount = operations.find((operation) => operation.operation_type === "cycle_count" && ["submitted", "in_progress"].includes(operation.status));
  if (activeCount && alerts.length < 3) alerts.push({ level: "Review", title: `${activeCount.reference} requires count completion`, meta: activeCount.title, action: "Review count", href: "/dashboard/inventory/cycle-counts" });

  const metrics: DashboardMetric[] = [
    makeMetric("Active products", formatInteger(activeProducts.length), `${health.healthy} healthy`, "positive", `${health.low + health.critical} need attention`, "products", throughput["30D"]),
    makeMetric("Stock on hand", formatQuantity(stockOnHand), `${formatQuantity(stockOnHand - balances.reduce((sum, balance) => sum + Number(balance.reserved), 0))} available`, "positive", `Across ${warehouses.size} warehouses`, "stock", throughput["30D"]),
    makeMetric("Open purchase orders", formatInteger(openPurchaseOrders.length), formatPhpCurrency(committed), openPurchaseOrders.length ? "attention" : "neutral", "Committed value", "orders", purchaseOrders.slice(0, 6).reverse().map((order) => Number(order.amount ?? 0))),
    makeMetric("Inbound work", formatInteger(inboundTasks.length), `${formatQuantity(inboundUnits)} units`, inboundTasks.length ? "attention" : "neutral", "Open receiving tasks", "inbound", inboundTasks.slice(0, 6).reverse().map((task) => Number(task.quantity ?? 0))),
  ];

  const data: DashboardData = {
    generatedAt: new Date().toISOString(),
    metrics,
    throughput,
    throughputTotal: movements.reduce((sum, movement) => sum + Math.abs(Number(movement.quantity)), 0),
    throughputTrend,
    service: { rate: serviceDenominator ? (onTime / serviceDenominator) * 100 : 0, onTime, late, exceptions },
    spend: [
      { label: "Purchase orders", amount: procurement.filter((record) => record.record_type === "purchase_order").reduce((sum, record) => sum + Number(record.amount ?? 0), 0) },
      { label: "Quotations", amount: procurement.filter((record) => record.record_type === "quotation").reduce((sum, record) => sum + Number(record.amount ?? 0), 0) },
      { label: "Requisitions", amount: procurement.filter((record) => record.record_type === "requisition").reduce((sum, record) => sum + Number(record.amount ?? 0), 0) },
    ],
    alerts: alerts.slice(0, 3),
    inbound: openPurchaseOrders.slice(0, 5).map((record) => ({ reference: record.reference, title: record.supplier_id ? suppliers.get(record.supplier_id) ?? record.title : record.title, expected: record.due_at ? formatDate(record.due_at) : "Not scheduled", value: formatPhpCurrency(Number(record.amount ?? 0)), status: record.status })),
    recentMovements: movements.slice(0, 5).map((movement) => ({ type: movement.movement_type, reference: movement.reference, quantity: Number(movement.quantity) })),
    inventoryHealth: health,
    approvals: { total: requisitionsWaiting + ordersWaiting, requisitions: requisitionsWaiting, purchaseOrders: ordersWaiting },
  };

  return <DashboardContent userName={userName} data={data} realtime organizationId={organizationId} />;
}

function bucketMovements(movements: Array<{ occurred_at: string; quantity: number }>, days: number, buckets: number) {
  const result = Array(buckets).fill(0) as number[];
  const now = Date.now();
  const span = (days * 86_400_000) / buckets;
  for (const movement of movements) {
    const age = now - new Date(movement.occurred_at).getTime();
    if (age < 0 || age > days * 86_400_000) continue;
    const bucket = Math.min(buckets - 1, buckets - 1 - Math.floor(age / span));
    result[bucket] += Math.abs(Number(movement.quantity));
  }
  return result;
}

function movementTotal(movements: Array<{ occurred_at: string; quantity: number }>, fromDays: number, toDays: number) {
  const now = Date.now();
  return movements.reduce((sum, movement) => {
    const ageDays = (now - new Date(movement.occurred_at).getTime()) / 86_400_000;
    return ageDays >= fromDays && ageDays < toDays ? sum + Math.abs(Number(movement.quantity)) : sum;
  }, 0);
}

function makeMetric(label: string, value: string, trend: string, trendTone: DashboardMetric["trendTone"], detail: string, kind: DashboardMetric["kind"], values: number[]): DashboardMetric {
  return { label, value, trend, trendTone, detail, kind, bars: normalizeBars(values) };
}

function normalizeBars(values: number[]) {
  const selected = values.slice(-6);
  while (selected.length < 6) selected.unshift(0);
  const max = Math.max(...selected, 1);
  return selected.map((value) => value === 0 ? 8 : Math.max(18, Math.round((value / max) * 100)));
}

function formatInteger(value: number) { return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value); }
function formatQuantity(value: number) { return new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(value); }
function formatDate(value: string) { return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
