const referencePrefixes: Record<string, string> = {
  products: "SKU",
  suppliers: "SUP",
  locations: "LOC",
  movements: "MOV",
  transfers: "TR",
  cycle_counts: "CC",
  receiving: "RCV",
  putaway: "PUT",
  picking: "PICK",
  requisitions: "PR",
  rfqs: "RFQ",
  quotations: "QT",
  purchase_orders: "PO",
  logistics: "SHP",
  documents: "DOC",
};

export function createOperationalReference(module: string) {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase();
  return `${referencePrefixes[module] ?? "REF"}-${date}-${suffix}`;
}
