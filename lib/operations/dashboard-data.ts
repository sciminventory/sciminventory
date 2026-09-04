export type DashboardMetric = {
  label: string;
  value: string;
  trend: string;
  trendTone: "positive" | "neutral" | "attention";
  detail: string;
  kind: "products" | "stock" | "orders" | "inbound";
  bars: number[];
};

export type DashboardAlert = {
  level: "Critical" | "Delayed" | "Review";
  title: string;
  meta: string;
  action: string;
  href: string;
};

export type DashboardInbound = {
  reference: string;
  title: string;
  expected: string;
  value: string;
  status: string;
};

export type DashboardMovement = {
  type: string;
  reference: string;
  quantity: number;
};

export type DashboardData = {
  generatedAt: string;
  metrics: DashboardMetric[];
  throughput: { "7D": number[]; "30D": number[]; "90D": number[] };
  throughputTotal: number;
  throughputTrend: number;
  service: { rate: number; onTime: number; late: number; exceptions: number };
  spend: Array<{ label: string; amount: number }>;
  alerts: DashboardAlert[];
  inbound: DashboardInbound[];
  recentMovements: DashboardMovement[];
  inventoryHealth: { healthy: number; low: number; critical: number; inactive: number };
  approvals: { total: number; requisitions: number; purchaseOrders: number };
  setupError?: string;
};

export function emptyDashboardData(setupError?: string): DashboardData {
  return {
    generatedAt: new Date().toISOString(),
    metrics: [
      metric("Active products", "0", "Live", "neutral", "No products yet", "products"),
      metric("Stock on hand", "0", "Live", "neutral", "Across active warehouses", "stock"),
      metric("Open purchase orders", "0", "$0 committed", "neutral", "Approved or sent", "orders"),
      metric("Inbound work", "0", "0 units", "neutral", "Open receiving tasks", "inbound"),
    ],
    throughput: { "7D": Array(7).fill(0), "30D": Array(15).fill(0), "90D": Array(18).fill(0) },
    throughputTotal: 0,
    throughputTrend: 0,
    service: { rate: 0, onTime: 0, late: 0, exceptions: 0 },
    spend: [
      { label: "Purchase orders", amount: 0 },
      { label: "Quotations", amount: 0 },
      { label: "Requisitions", amount: 0 },
    ],
    alerts: [],
    inbound: [],
    recentMovements: [],
    inventoryHealth: { healthy: 0, low: 0, critical: 0, inactive: 0 },
    approvals: { total: 0, requisitions: 0, purchaseOrders: 0 },
    setupError,
  };
}

function metric(label: string, value: string, trend: string, trendTone: DashboardMetric["trendTone"], detail: string, kind: DashboardMetric["kind"]): DashboardMetric {
  return { label, value, trend, trendTone, detail, kind, bars: [0, 0, 0, 0, 0, 0] };
}
