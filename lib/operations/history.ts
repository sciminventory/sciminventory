export const historyModules = ["warehouse", "recruitment", "vendors", "logistics", "documents"] as const;

export type HistoryModule = (typeof historyModules)[number];

export const historyLabels: Record<HistoryModule, string> = {
  warehouse: "Warehouse",
  recruitment: "Recruitment",
  vendors: "Vendors",
  logistics: "Logistics",
  documents: "Documents",
};

export type HistoryEvent = {
  id: string;
  module: HistoryModule;
  action: string;
  entityType: string;
  entityId: string | null;
  occurredAt: string;
};

export function parseHistoryModule(value?: string | null): HistoryModule {
  return historyModules.includes(value as HistoryModule) ? value as HistoryModule : "warehouse";
}

export function historyModuleFor(entityType: string, action: string): HistoryModule | null {
  const value = `${entityType} ${action}`.toLowerCase();
  if (/job_|applicant|application|screening|recruit/.test(value)) return "recruitment";
  if (/supplier|vendor|purchase_order|procurement|invoice|payment/.test(value)) return "vendors";
  if (/shipment|logistic|goods_receipt|return_request/.test(value)) return "logistics";
  if (/document|storage_object/.test(value)) return "documents";
  if (/warehouse|location|inventory|product|stock|receiving|putaway|picking/.test(value)) return "warehouse";
  return null;
}

export function humanizeHistoryValue(value: string) {
  return value.replaceAll("_", " ").replaceAll(".", " · ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
