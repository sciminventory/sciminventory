export const modulePaths = {
  products: "/dashboard/inventory/products",
  stock: "/dashboard/inventory/stock",
  movements: "/dashboard/inventory/movements",
  transfers: "/dashboard/inventory/transfers",
  cycle_counts: "/dashboard/inventory/cycle-counts",
  receiving: "/dashboard/warehouse/receiving",
  putaway: "/dashboard/warehouse/putaway",
  picking: "/dashboard/warehouse/picking",
  locations: "/dashboard/warehouse/locations",
  requisitions: "/dashboard/procurement/requisitions",
  rfqs: "/dashboard/procurement/rfqs",
  quotations: "/dashboard/procurement/quotations",
  purchase_orders: "/dashboard/procurement/purchase-orders",
  suppliers: "/dashboard/suppliers",
  logistics: "/dashboard/logistics",
  documents: "/dashboard/documents",
} as const;

export type OperationalModule = keyof typeof modulePaths;

export type ModuleConfig = {
  key: OperationalModule;
  title: string;
  eyebrow: string;
  description: string;
  singular: string;
  referenceLabel: string;
  titleLabel: string;
  statusOptions: string[];
  createLabel: string;
  readOnly?: boolean;
  needsWarehouse?: boolean;
  needsSecondWarehouse?: boolean;
  needsProduct?: boolean;
  needsSupplier?: boolean;
  quantityLabel?: string;
  detailLabel?: string;
};

export const moduleConfigs: Record<OperationalModule, ModuleConfig> = {
  products: {
    key: "products",
    title: "Products",
    eyebrow: "Inventory · Product master",
    description: "Maintain the SKUs, categories, units, and reorder policies used across operations.",
    singular: "product",
    referenceLabel: "SKU",
    titleLabel: "Product name",
    statusOptions: ["active", "inactive"],
    createLabel: "Add product",
    quantityLabel: "Reorder point",
    detailLabel: "Category",
  },
  stock: {
    key: "stock",
    title: "Stock overview",
    eyebrow: "Inventory · Live balances",
    description: "See on-hand, reserved, and available quantities by product and warehouse.",
    singular: "balance",
    referenceLabel: "SKU",
    titleLabel: "Product",
    statusOptions: [],
    createLabel: "Post movement",
    readOnly: true,
  },
  movements: {
    key: "movements",
    title: "Stock movements",
    eyebrow: "Inventory · Immutable ledger",
    description: "Post controlled receipts, issues, transfers, and adjustments to the stock ledger.",
    singular: "movement",
    referenceLabel: "Reference",
    titleLabel: "Movement type",
    statusOptions: ["receipt", "issue", "adjustment", "transfer_in", "transfer_out"],
    createLabel: "Post movement",
    needsWarehouse: true,
    needsProduct: true,
    quantityLabel: "Quantity",
    detailLabel: "Notes",
  },
  transfers: {
    key: "transfers",
    title: "Transfers",
    eyebrow: "Inventory · Network movement",
    description: "Plan and follow stock transfers between active warehouses.",
    singular: "transfer",
    referenceLabel: "Transfer reference",
    titleLabel: "Transfer title",
    statusOptions: ["draft", "submitted", "in_progress", "completed", "cancelled"],
    createLabel: "Create transfer",
    needsWarehouse: true,
    needsSecondWarehouse: true,
    quantityLabel: "Total units",
    detailLabel: "Notes",
  },
  cycle_counts: {
    key: "cycle_counts",
    title: "Cycle counts",
    eyebrow: "Inventory · Stock assurance",
    description: "Schedule count work, record progress, and preserve a reviewable count trail.",
    singular: "cycle count",
    referenceLabel: "Count reference",
    titleLabel: "Count title",
    statusOptions: ["draft", "submitted", "in_progress", "completed", "cancelled"],
    createLabel: "Schedule count",
    needsWarehouse: true,
    quantityLabel: "Expected lines",
    detailLabel: "Instructions",
  },
  receiving: taskConfig("receiving", "Receiving", "Inbound execution", "Track expected receipts, dock work, and receiving completion.", "receipt"),
  putaway: taskConfig("putaway", "Putaway", "Warehouse execution", "Move received goods from staging into controlled storage locations.", "putaway task"),
  picking: taskConfig("picking", "Picking", "Warehouse execution", "Create and complete outbound picking work with warehouse scope.", "pick task"),
  locations: {
    key: "locations",
    title: "Warehouse locations",
    eyebrow: "Warehouse · Location master",
    description: "Maintain receiving, storage, picking, staging, and quarantine locations.",
    singular: "location",
    referenceLabel: "Location code",
    titleLabel: "Location name",
    statusOptions: ["receiving", "storage", "picking", "staging", "quarantine"],
    createLabel: "Add location",
    needsWarehouse: true,
    detailLabel: "Location type",
  },
  requisitions: procurementConfig("requisitions", "Requisitions", "Purchase requisition"),
  rfqs: procurementConfig("rfqs", "RFQs", "Request for quotation"),
  quotations: procurementConfig("quotations", "Quotations", "Supplier quotation"),
  purchase_orders: procurementConfig("purchase_orders", "Purchase orders", "Purchase order"),
  suppliers: {
    key: "suppliers",
    title: "Suppliers",
    eyebrow: "Supplier · Directory",
    description: "Manage approved vendors, contact details, status, and standard lead time.",
    singular: "supplier",
    referenceLabel: "Supplier code",
    titleLabel: "Supplier name",
    statusOptions: ["active", "on_hold", "inactive"],
    createLabel: "Add supplier",
    quantityLabel: "Lead time (days)",
    detailLabel: "Contact email",
  },
  logistics: {
    key: "logistics",
    title: "Logistics",
    eyebrow: "Logistics · Shipments",
    description: "Track carriers, shipment references, promised dates, and delivery exceptions.",
    singular: "shipment",
    referenceLabel: "Shipment reference",
    titleLabel: "Shipment title",
    statusOptions: ["planned", "booked", "in_transit", "delivered", "exception", "cancelled"],
    createLabel: "Create shipment",
    needsWarehouse: true,
    detailLabel: "Carrier",
  },
  documents: {
    key: "documents",
    title: "Documents",
    eyebrow: "Workspace · Controlled files",
    description: "Upload organization documents to private storage and preserve searchable metadata.",
    singular: "document",
    referenceLabel: "Document reference",
    titleLabel: "Document title",
    statusOptions: ["active", "verified", "expired", "archived"],
    createLabel: "Upload document",
    detailLabel: "Document type",
  },
};

function taskConfig(
  key: "receiving" | "putaway" | "picking",
  title: string,
  context: string,
  description: string,
  singular: string,
): ModuleConfig {
  return {
    key,
    title,
    eyebrow: `Warehouse · ${context}`,
    description,
    singular,
    referenceLabel: "Task reference",
    titleLabel: "Task title",
    statusOptions: ["open", "assigned", "in_progress", "completed", "cancelled"],
    createLabel: `Create ${singular}`,
    needsWarehouse: true,
    quantityLabel: "Units",
    detailLabel: "Instructions",
  };
}

function procurementConfig(
  key: "requisitions" | "rfqs" | "quotations" | "purchase_orders",
  title: string,
  singular: string,
): ModuleConfig {
  return {
    key,
    title,
    eyebrow: "Procurement · Source to order",
    description: `Create, track, and govern every ${singular.toLowerCase()} in the workspace.`,
    singular,
    referenceLabel: "Reference",
    titleLabel: "Purpose / title",
    statusOptions: ["draft", "submitted", "approved", "sent", "received", "completed", "rejected", "cancelled"],
    createLabel: `Create ${singular.toLowerCase()}`,
    needsWarehouse: true,
    needsSupplier: key !== "requisitions",
    quantityLabel: "Amount (₱)",
    detailLabel: "Notes",
  };
}

export function getModuleFromSegments(segments: string[]): ModuleConfig | null {
  const path = `/dashboard/${segments.join("/")}`;
  const key = (Object.entries(modulePaths).find(([, href]) => href === path)?.[0] ?? null) as OperationalModule | null;
  return key ? moduleConfigs[key] : null;
}
