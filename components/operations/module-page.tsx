"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Boxes,
  FileUp,
  Filter,
  PackageOpen,
  Plus,
  Search,
  Download,
  Eye,
  Pencil,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { AdminActionButton } from "@/components/operations/admin-action-button";
import { ScrollReveal } from "@/components/motion/scroll-motion";
import { ToastNotification } from "@/components/ui/toast-notification";
import { createOperationalItem, deleteOperationalItem, downloadDocument, updateOperationalItem, updateOperationalStatus } from "@/app/(app)/dashboard/[...segments]/actions";
import { modulePaths, type ModuleConfig } from "@/lib/operations/modules";
import { formatPhpCurrency } from "@/lib/utils";

export type OperationalItem = {
  id: string;
  reference: string;
  title: string;
  detail: string;
  editDetail?: string;
  status: string;
  quantity: number | null;
  reorderLevel?: number | null;
  dueAt: string | null;
  createdAt: string;
  warehouse: string | null;
  warehouseId?: string | null;
  locationId?: string | null;
  supplierId?: string | null;
  destinationWarehouseId?: string | null;
  relatedId?: string | null;
  unitPrice?: number | null;
  expiryDate?: string | null;
  orderDate?: string | null;
  productId?: string | null;
  lineQuantity?: number | null;
  supplierName?: string | null;
  contactPerson?: string | null;
  contactEmail?: string | null;
  phone?: string | null;
  taxId?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  paymentTerms?: number | null;
  rating?: number | null;
  immutable?: boolean;
};

export type ModuleOption = { id: string; code: string; name: string; warehouseId?: string };

type Props = {
  config: ModuleConfig;
  organizationId: string;
  role: string;
  items: OperationalItem[];
  warehouses: ModuleOption[];
  products: ModuleOption[];
  suppliers: ModuleOption[];
  locations: ModuleOption[];
  createReference: string;
  canManage: boolean;
  success?: string;
  error?: string;
  setupError?: string;
  query?: string;
  openCreate?: boolean;
};

const fieldClass = "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-3 focus:ring-blue-100";
const labelClass = "mb-2 block font-mono text-xs font-medium uppercase tracking-[.08em] text-muted";

export function ModulePage({ config, ...props }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(Boolean(props.openCreate));
  const [editingItem, setEditingItem] = useState<OperationalItem | null>(null);
  const [viewOnly, setViewOnly] = useState(false);
  const filtered = props.query
    ? props.items.filter((item) => `${item.reference} ${item.title} ${item.detail} ${item.status} ${item.warehouse ?? ""}`.toLowerCase().includes(props.query!.toLowerCase()))
    : props.items;
  const active = props.items.filter((item) => !["completed", "delivered", "inactive", "archived", "cancelled"].includes(item.status)).length;
  const completed = props.items.filter((item) => ["completed", "delivered", "verified"].includes(item.status)).length;
  const totalQuantity = props.items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
  const averageSupplierRating = props.items.length ? props.items.reduce((sum, item) => sum + (item.rating ?? 0), 0) / props.items.length : 0;

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [drawerOpen]);

  return (
    <div className="min-w-0 w-full p-3 min-[380px]:p-4 sm:p-6 lg:p-8 xl:p-10">
      <ScrollReveal distance={14}>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <p className="eyebrow text-muted">{config.eyebrow}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-[-.045em]">{config.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-5 text-muted">{config.description}</p>
        </div>
        {config.readOnly ? (
          <Link href={`${modulePaths.products}?create=1`} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-bold text-white hover:bg-blue-700 sm:w-auto">
            Add product <ArrowRight size={13} />
          </Link>
        ) : props.canManage ? (
          <button type="button" onClick={() => { setEditingItem(null); setViewOnly(false); setDrawerOpen(true); }} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-bold text-white hover:bg-blue-700 sm:w-auto">
            <Plus size={14} /> {config.createLabel}
          </button>
        ) : (
          <span className="rounded-full border border-line bg-white px-3 py-2 font-mono text-xs uppercase text-muted">{props.role.replaceAll("_", " ")} · read only</span>
        )}
      </header>
      </ScrollReveal>

      <ToastNotification
        success={props.success}
        error={props.error}
        setupError={props.setupError}
      />

      <ScrollReveal className="mt-6" distance={16}>
      <div className="grid overflow-hidden rounded-2xl border border-line bg-white shadow-[0_14px_40px_rgba(25,72,133,.055)] sm:grid-cols-3">
        <Metric label="Total records" value={props.items.length.toLocaleString()} detail={`All ${config.title.toLowerCase()}`} />
        <Metric label="Active workflow" value={active.toLocaleString()} detail="Open or actionable" />
        <Metric label={config.key === "products" ? "Stock on hand" : config.key === "suppliers" ? "Average rating" : config.quantityLabel ?? "Completed"} value={config.key === "suppliers" ? averageSupplierRating.toFixed(2) : config.quantityLabel ? formatOperationalValue(totalQuantity, config) : completed.toLocaleString()} detail={config.key === "suppliers" ? "Out of 5.00" : config.quantityLabel ? "Across visible records" : "Completed records"} />
      </div>
      </ScrollReveal>

      <ScrollReveal className="mt-6" distance={16}>
      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_14px_40px_rgba(25,72,133,.055)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <form className="flex h-11 w-full min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-[#f8faff] px-3 sm:min-w-[220px] sm:max-w-sm">
            <Search size={13} className="text-muted" />
            <input name="q" defaultValue={props.query} placeholder={`Search ${config.title.toLowerCase()}...`} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
          </form>
          <span className="flex items-center gap-2 font-mono text-xs uppercase text-muted sm:ml-auto"><Filter size={12} /> {filtered.length} shown</span>
        </div>
        {filtered.length === 0 ? (
          <div className="grid min-h-64 place-items-center p-8 text-center">
            <div>
              <span className="mx-auto grid size-11 place-items-center rounded-xl bg-blue-50 text-accent"><Boxes size={18} /></span>
              <h2 className="mt-4 text-sm font-bold">{props.query ? "No matching records" : `No ${config.title.toLowerCase()} yet`}</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-muted">
                {props.query ? "Try a different reference or name." : config.readOnly ? "Add a product with its opening quantity to establish the first live balance." : `Use “${config.createLabel}” to create the first workspace record.`}
              </p>
            </div>
          </div>
        ) : (
          <><div className="divide-y divide-line md:hidden">
            {filtered.map((item) => <ItemCard key={item.id} item={item} config={config} organizationId={props.organizationId} canManage={props.canManage} onView={() => { setEditingItem(item); setViewOnly(true); setDrawerOpen(true); }} onEdit={() => { setEditingItem(item); setViewOnly(false); setDrawerOpen(true); }} />)}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className={`w-full text-left ${config.key === "products" ? "min-w-[640px]" : config.key === "suppliers" ? "min-w-[1100px]" : "min-w-[820px]"}`}>
              <thead className="border-b border-line bg-[#f8faff] font-mono text-xs uppercase tracking-wider text-muted">
                {config.key === "products" ? (
                  <tr><th className="px-5 py-3 font-medium">Name</th><th className="px-5 py-3 font-medium">SKU</th><th className="px-5 py-3 font-medium">Quantity</th><th className="px-5 py-3 text-right font-medium">Actions</th></tr>
                ) : config.key === "suppliers" ? (
                  <tr><th className="px-5 py-3 font-medium">Company</th><th className="px-5 py-3 font-medium">Contact person</th><th className="px-5 py-3 font-medium">Contact info</th><th className="px-5 py-3 font-medium">Location</th><th className="px-5 py-3 font-medium">Rating</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Actions</th></tr>
                ) : config.key === "purchase_orders" ? (
                  <tr><th className="px-5 py-3 font-medium">PO Number</th><th className="px-5 py-3 font-medium">Supplier</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Total</th><th className="px-5 py-3 font-medium">Order date</th><th className="px-5 py-3 text-right font-medium">Actions</th></tr>
                ) : (
                  <tr><th className="px-5 py-3 font-medium">Reference</th><th className="px-5 py-3 font-medium">Record</th><th className="px-5 py-3 font-medium">Warehouse / context</th><th className="px-5 py-3 font-medium">{config.quantityLabel ?? "Quantity"}</th><th className="px-5 py-3 font-medium">Created / due</th><th className="px-5 py-3 font-medium">Status / action</th></tr>
                )}
              </thead>
              <tbody>
                {filtered.map((item) => config.key === "products"
                  ? <ProductRow key={item.id} item={item} organizationId={props.organizationId} canManage={props.canManage} onEdit={() => { setEditingItem(item); setViewOnly(false); setDrawerOpen(true); }} />
                  : config.key === "suppliers"
                    ? <SupplierRow key={item.id} item={item} organizationId={props.organizationId} canManage={props.canManage} onEdit={() => { setEditingItem(item); setViewOnly(false); setDrawerOpen(true); }} />
                  : config.key === "purchase_orders"
                    ? <PurchaseOrderRow key={item.id} item={item} organizationId={props.organizationId} canManage={props.canManage} onView={() => { setEditingItem(item); setViewOnly(true); setDrawerOpen(true); }} onEdit={() => { setEditingItem(item); setViewOnly(false); setDrawerOpen(true); }} />
                    : <ItemRow key={item.id} item={item} config={config} organizationId={props.organizationId} canManage={props.canManage} onEdit={() => { setEditingItem(item); setViewOnly(false); setDrawerOpen(true); }} />)}
              </tbody>
            </table>
          </div></>
        )}
      </section>
      </ScrollReveal>

      <AnimatePresence>
        {drawerOpen && !config.readOnly && (props.canManage || viewOnly) && (
          <>
            <motion.button
              type="button"
              aria-label="Close create form"
              className="fixed inset-0 z-[70] bg-[#07172d]/40 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-labelledby="record-drawer-title"
              className="fixed inset-y-0 right-0 z-[80] flex h-dvh w-full flex-col border-l border-line bg-[#f8faff] shadow-[-24px_0_70px_rgba(7,23,45,.18)] sm:max-w-[580px]"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              <div className="flex items-start gap-3 border-b border-line bg-white px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-accent"><PackageOpen size={19} /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs uppercase tracking-[.1em] text-blue-700">{viewOnly ? "View record" : editingItem ? "Edit record" : "Create record"}</p>
                  <h2 id="record-drawer-title" className="mt-1 text-xl font-bold tracking-[-.035em]">{viewOnly ? `${config.singular.replace(/^./, (letter) => letter.toUpperCase())} details` : editingItem ? `Edit ${config.singular}` : `New ${config.singular}`}</h2>
                  <p className="mt-1 text-sm text-muted">Validated and securely scoped to your organization.</p>
                </div>
                <button type="button" onClick={() => setDrawerOpen(false)} className="grid size-10 shrink-0 place-items-center rounded-xl border border-line text-muted transition hover:bg-blue-50 hover:text-accent" aria-label="Close drawer"><X size={17} /></button>
              </div>
              <RecordForm item={editingItem} viewOnly={viewOnly} createReference={props.createReference} config={config} organizationId={props.organizationId} warehouses={props.warehouses} products={props.products} suppliers={props.suppliers} locations={props.locations} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function RecordForm({ item, viewOnly, createReference, config, organizationId, warehouses, products, suppliers, locations }: { item: OperationalItem | null; viewOnly: boolean; createReference: string; config: ModuleConfig; organizationId: string; warehouses: ModuleOption[]; products: ModuleOption[]; suppliers: ModuleOption[]; locations: ModuleOption[] }) {
  const relatedOptions = config.needsProduct ? products : config.needsSupplier ? suppliers : [];
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(item?.warehouseId ?? "");
  const [selectedLocationId, setSelectedLocationId] = useState(item?.locationId ?? "");
  const automaticReference = item?.reference ?? createReference;
  const availableLocations = locations.filter((location) => location.warehouseId === selectedWarehouseId);
  const effectiveLocationId = availableLocations.some((location) => location.id === selectedLocationId)
    ? selectedLocationId
    : availableLocations.length === 1 ? availableLocations[0].id : "";
  return (
    <form action={item ? updateOperationalItem : createOperationalItem} className="flex min-h-0 flex-1 flex-col">
      <fieldset disabled={viewOnly} className="grid flex-1 content-start gap-5 overflow-y-auto p-4 disabled:opacity-90 sm:grid-cols-2 sm:p-6">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="module" value={config.key} />
      {item && <input type="hidden" name="itemId" value={item.id} />}
      {config.key === "products" ? <>
      <Field label="SKU" name="reference" defaultValue={item?.reference ?? createReference} placeholder="Enter SKU" required maxLength={40} />
      <Field label="Product name" name="title" defaultValue={item?.title} placeholder="Enter product name" required maxLength={160} />
      {!item ? <Field label="Quantity" name="initialQuantity" type="number" step="0.0001" min="0" defaultValue="0" placeholder="0" required /> : <input type="hidden" name="initialQuantity" value="" />}
      <Field label="Reorder level" name="quantity" type="number" step="0.0001" min="0" defaultValue={item?.reorderLevel ?? 0} placeholder="0" required />
      <Field label="Category" name="detail" defaultValue={item?.editDetail ?? item?.detail} placeholder="Enter category" />
      <Field label="Unit price (₱)" name="unitPrice" type="number" step="0.01" min="0" defaultValue={item?.unitPrice ?? 0} placeholder="0.00" required />
      <Select label="Warehouse" name="warehouseId" options={warehouses} value={selectedWarehouseId} onChange={(event) => { setSelectedWarehouseId(event.target.value); setSelectedLocationId(""); }} required />
      <Select label="Supplier" name="supplierId" options={suppliers} defaultValue={item?.supplierId ?? ""} required />
      <div><Select label="Location in warehouse" name="locationId" options={availableLocations} value={effectiveLocationId} onChange={(event) => setSelectedLocationId(event.target.value)} emptyLabel={selectedWarehouseId ? "No active locations in this warehouse" : "Select a warehouse first"} required /><p className="mt-1.5 text-xs text-muted">{selectedWarehouseId ? `${availableLocations.length} active location${availableLocations.length === 1 ? "" : "s"} available` : "Choose a warehouse to load its locations."}</p></div>
      <Field label="Expiry date" name="expiryDate" type="date" defaultValue={item?.expiryDate ?? undefined} />
      <label><span className={labelClass}>Status</span><select name="status" defaultValue={item?.status ?? "active"} className={fieldClass}>{config.statusOptions.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}</select></label>
      <input type="hidden" name="destinationWarehouseId" value="" />
      <input type="hidden" name="relatedId" value="" />
      <input type="hidden" name="dueAt" value="" />
      </> : config.key === "suppliers" ? <>
      <input type="hidden" name="reference" value={automaticReference} />
      <Field label="Company name" name="title" defaultValue={item?.title} required maxLength={160} />
      <Field label="Contact person" name="contactPerson" defaultValue={item?.contactPerson ?? undefined} required maxLength={160} />
      <Field label="Email address" name="contactEmail" type="email" defaultValue={item?.contactEmail ?? undefined} required />
      <Field label="Phone" name="phone" type="tel" defaultValue={item?.phone ?? undefined} required />
      <Field label="Tax ID" name="taxId" defaultValue={item?.taxId ?? undefined} required />
      <Field label="Address" name="address" defaultValue={item?.address ?? undefined} required />
      <Field label="City" name="city" defaultValue={item?.city ?? undefined} required />
      <Field label="Country" name="country" defaultValue={item?.country ?? "PH"} minLength={2} maxLength={2} required />
      <Field label="Payment terms (days)" name="paymentTerms" type="number" min="0" max="365" step="1" defaultValue={item?.paymentTerms ?? 30} required />
      <Field label="Rating (0.00–5.00)" name="rating" type="number" min="0" max="5" step="0.01" defaultValue={item?.rating ?? 0} required />
      <label><span className={labelClass}>Status</span><select name="status" defaultValue={item?.status ?? "active"} className={fieldClass}>{config.statusOptions.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}</select></label>
      <input type="hidden" name="quantity" value="" /><input type="hidden" name="warehouseId" value="" /><input type="hidden" name="destinationWarehouseId" value="" /><input type="hidden" name="relatedId" value="" /><input type="hidden" name="locationId" value="" /><input type="hidden" name="supplierId" value="" /><input type="hidden" name="initialQuantity" value="" /><input type="hidden" name="unitPrice" value="" /><input type="hidden" name="productId" value="" /><input type="hidden" name="lineQuantity" value="" /><input type="hidden" name="orderDate" value="" /><input type="hidden" name="expiryDate" value="" /><input type="hidden" name="detail" value="" /><input type="hidden" name="dueAt" value="" />
      </> : config.key === "purchase_orders" ? <>
      <input type="hidden" name="reference" value={automaticReference} />
      <input type="hidden" name="title" value={`Purchase order ${automaticReference}`} />
      <Select label="Supplier" name="relatedId" options={suppliers} defaultValue={item?.relatedId ?? ""} required />
      <Select label="Warehouse" name="warehouseId" options={warehouses} defaultValue={item?.warehouseId ?? ""} required />
      <Field label="Order date" name="orderDate" type="date" defaultValue={item?.orderDate ?? new Date().toISOString().slice(0, 10)} required />
      <Field label="Expected delivery" name="dueAt" type="date" defaultValue={item?.dueAt?.slice(0, 10)} required />
      <label><span className={labelClass}>Status</span><select name="status" defaultValue={item?.status ?? "draft"} className={fieldClass}>{config.statusOptions.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}</select></label>
      <Field label="Notes" name="detail" defaultValue={item?.editDetail ?? item?.detail} placeholder="Add purchasing instructions or notes" />
      <Select label="Inventory item" name="productId" options={products} defaultValue={item?.productId ?? ""} required />
      <Field label="Quantity" name="lineQuantity" type="number" step="0.0001" min="0.0001" defaultValue={item?.lineQuantity ?? undefined} required />
      <Field label="Unit price (₱)" name="unitPrice" type="number" step="0.01" min="0" defaultValue={item?.unitPrice ?? undefined} required />
      <input type="hidden" name="quantity" value="" />
      <input type="hidden" name="destinationWarehouseId" value="" />
      <input type="hidden" name="locationId" value="" />
      <input type="hidden" name="supplierId" value="" />
      <input type="hidden" name="initialQuantity" value="" />
      <input type="hidden" name="expiryDate" value="" />
      </> : <>
      <label>
        <span className={labelClass}>{config.referenceLabel}</span>
        <span className="relative block">
          <Sparkles className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" size={14} />
          <input name="reference" value={automaticReference} readOnly aria-label={`${config.referenceLabel}, automatically generated`} className={`${fieldClass} cursor-default bg-blue-50/60 pl-9 pr-24 font-mono font-semibold text-blue-800`} />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">Automatic</span>
        </span>
      </label>
      {config.key === "movements" ? <input type="hidden" name="title" value="Inventory movement" /> : <Field label={config.titleLabel} name="title" defaultValue={item?.title} placeholder={`Enter ${config.titleLabel.toLowerCase()}`} />}
      {config.needsWarehouse && <Select label={config.key === "transfers" ? "Source warehouse" : "Warehouse"} name="warehouseId" options={warehouses} value={selectedWarehouseId} onChange={(event) => setSelectedWarehouseId(event.target.value)} required />}
      {config.key === "movements" && <Select label="Warehouse location" name="locationId" options={availableLocations} required />}
      {config.key !== "movements" && <input type="hidden" name="locationId" value="" />}
      {config.needsSecondWarehouse && <Select label="Destination warehouse" name="destinationWarehouseId" options={warehouses} defaultValue={item?.destinationWarehouseId ?? ""} required />}
      {!config.needsSecondWarehouse && <input type="hidden" name="destinationWarehouseId" value="" />}
      {(config.needsProduct || config.needsSupplier) && <Select label={config.needsProduct ? "Product" : "Supplier"} name="relatedId" options={relatedOptions} defaultValue={item?.relatedId ?? ""} required={config.needsProduct} />}
      {!config.needsProduct && !config.needsSupplier && <input type="hidden" name="relatedId" value="" />}
      <label><span className={labelClass}>{config.key === "locations" ? "Location type" : config.key === "movements" ? "Movement type" : item ? "Status" : "Initial status"}</span><select name="status" defaultValue={item?.status} className={fieldClass}>{config.statusOptions.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}</select></label>
      {config.quantityLabel && config.key !== "locations" ? <Field label={config.quantityLabel} name="quantity" type="number" step="0.0001" min={config.key === "movements" ? undefined : 0} defaultValue={item?.quantity ?? undefined} placeholder="0" required={config.key === "movements"} /> : <input type="hidden" name="quantity" value="" />}
      {!["products", "suppliers", "locations", "movements", "documents"].includes(config.key) && <Field label="Due date" name="dueAt" type="datetime-local" defaultValue={toDateTimeLocal(item?.dueAt)} />}
      {["products", "suppliers", "locations", "movements", "documents"].includes(config.key) && <input type="hidden" name="dueAt" value="" />}
      <Field label={config.detailLabel ?? "Notes"} name="detail" type="text" defaultValue={item?.editDetail ?? item?.detail} placeholder={`Enter ${(config.detailLabel ?? "notes").toLowerCase()}`} />
      {config.key === "documents" && !item && <label className="sm:col-span-2"><span className={labelClass}>File · max 25 MB</span><input required type="file" name="file" className="block h-10 w-full rounded-lg border border-line bg-white text-sm file:mr-3 file:h-full file:border-0 file:border-r file:border-line file:bg-blue-50 file:px-3 file:text-sm file:font-bold file:text-blue-700" /></label>}
      </>}
      </fieldset>
      {!viewOnly && <div className="border-t border-line bg-white p-5">
        <AdminActionButton className="h-11 w-full">{item ? <Pencil size={14} /> : <FileUp size={14} />} {item ? "Save changes" : config.createLabel}</AdminActionButton>
        <p className="mt-3 text-center text-xs text-muted">This action will be recorded in the workspace audit history.</p>
      </div>}
    </form>
  );
}

function ItemCard({ item, config, organizationId, canManage, onView, onEdit }: { item: OperationalItem; config: ModuleConfig; organizationId: string; canManage: boolean; onView: () => void; onEdit: () => void }) {
  return (
    <article className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-all font-mono text-sm font-medium text-blue-700">{item.reference}</p>
          <h2 className="mt-1 break-words text-sm font-bold">{item.title}</h2>
          <p className="mt-1 break-words text-sm text-muted">{item.detail || "No additional details"}</p>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-mist p-3 text-sm">
        <div><dt className="text-muted">Warehouse / context</dt><dd className="mt-1 break-words font-semibold">{item.warehouse ?? "Organization-wide"}</dd></div>
        <div><dt className="text-muted">{config.key === "products" ? "Quantity" : config.key === "suppliers" ? "Rating" : config.quantityLabel ?? "Quantity"}</dt><dd className="mt-1 font-mono font-semibold">{item.quantity === null ? "—" : config.key === "suppliers" ? `${Number(item.rating ?? 0).toFixed(2)} / 5.00` : formatOperationalValue(item.quantity, config)}</dd></div>
        <div><dt className="text-muted">Created</dt><dd className="mt-1 font-mono font-semibold">{formatDate(item.createdAt)}</dd></div>
        <div><dt className="text-muted">Due</dt><dd className="mt-1 font-mono font-semibold">{item.dueAt ? formatDate(item.dueAt) : "Not set"}</dd></div>
      </dl>
      {(canManage || config.key === "documents" || config.key === "purchase_orders") && <div className="mt-4"><ItemActions item={item} config={config} organizationId={organizationId} canManage={canManage} onView={onView} onEdit={onEdit} mobile /></div>}
    </article>
  );
}

function PurchaseOrderRow({ item, organizationId, canManage, onView, onEdit }: { item: OperationalItem; organizationId: string; canManage: boolean; onView: () => void; onEdit: () => void }) {
  return (
    <tr className="border-b border-line text-sm last:border-0">
      <td className="px-5 py-4 font-mono font-semibold text-blue-700">{item.reference}</td>
      <td className="px-5 py-4 font-semibold">{item.supplierName ?? "—"}</td>
      <td className="px-5 py-4"><StatusBadge status={item.status} /></td>
      <td className="px-5 py-4 font-mono font-semibold">{formatPhpCurrency(item.quantity ?? 0)}</td>
      <td className="px-5 py-4 font-mono text-xs">{formatDate(item.orderDate ?? item.createdAt)}</td>
      <td className="px-5 py-3">
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onView} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3 text-xs font-bold text-ink transition hover:bg-blue-50 hover:text-blue-700"><Eye size={12} /> View</button>
          {canManage && <><button type="button" onClick={onEdit} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3 text-xs font-bold text-ink transition hover:bg-blue-50 hover:text-blue-700"><Pencil size={12} /> Edit</button>
          <DeleteRecordButton item={item} organizationId={organizationId} module="purchase_orders" /></>}
        </div>
      </td>
    </tr>
  );
}

function ItemRow({ item, config, organizationId, canManage, onEdit }: { item: OperationalItem; config: ModuleConfig; organizationId: string; canManage: boolean; onEdit: () => void }) {
  return (
    <tr className="border-b border-line text-sm last:border-0">
      <td className="px-5 py-4 font-mono font-medium text-blue-700">{item.reference}</td>
      <td className="max-w-xs px-5 py-4"><p className="font-bold">{item.title}</p><p className="mt-1 truncate text-xs text-muted">{item.detail || "No additional details"}</p></td>
      <td className="px-5 py-4 text-sm text-muted">{item.warehouse ?? "Organization-wide"}</td>
      <td className="px-5 py-4 font-mono">{item.quantity === null ? "—" : formatOperationalValue(item.quantity, config)}</td>
      <td className="px-5 py-4"><p className="font-mono text-xs">{formatDate(item.createdAt)}</p>{item.dueAt && <p className="mt-1 text-xs text-muted">Due {formatDate(item.dueAt)}</p>}</td>
      <td className="px-5 py-3">
        <ItemActions item={item} config={config} organizationId={organizationId} canManage={canManage} onEdit={onEdit} />
      </td>
    </tr>
  );
}

function ProductRow({ item, organizationId, canManage, onEdit }: { item: OperationalItem; organizationId: string; canManage: boolean; onEdit: () => void }) {
  return (
    <tr className="border-b border-line text-sm last:border-0">
      <td className="px-5 py-4 font-bold text-ink">{item.title}</td>
      <td className="px-5 py-4 font-mono font-semibold text-blue-700">{item.reference}</td>
      <td className="px-5 py-4 font-mono font-semibold">{formatNumber(item.quantity ?? 0)}</td>
      <td className="px-5 py-3">
        {canManage && <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onEdit} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3 text-xs font-bold text-ink transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"><Pencil size={12} /> Edit</button>
          <form action={deleteOperationalItem} onSubmit={(event) => { if (!window.confirm(`Delete ${item.title}? The product will be archived and its inventory history will be preserved.`)) event.preventDefault(); }}>
            <input type="hidden" name="organizationId" value={organizationId} />
            <input type="hidden" name="module" value="products" />
            <input type="hidden" name="itemId" value={item.id} />
            <button type="submit" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-xs font-bold text-red-700 transition hover:bg-red-50"><Trash2 size={12} /> Delete</button>
          </form>
        </div>}
      </td>
    </tr>
  );
}

function SupplierRow({ item, organizationId, canManage, onEdit }: { item: OperationalItem; organizationId: string; canManage: boolean; onEdit: () => void }) {
  return (
    <tr className="border-b border-line text-sm last:border-0">
      <td className="px-5 py-4 font-bold text-ink">{item.title}</td>
      <td className="px-5 py-4">{item.contactPerson ?? "—"}</td>
      <td className="px-5 py-4"><p>{item.contactEmail ?? "—"}</p><p className="mt-1 text-xs text-muted">{item.phone ?? "No phone"}</p></td>
      <td className="max-w-64 px-5 py-4"><p className="truncate">{item.address ?? "—"}</p><p className="mt-1 text-xs text-muted">{[item.city, item.country].filter(Boolean).join(", ")}</p></td>
      <td className="px-5 py-4 font-mono font-semibold">{Number(item.rating ?? 0).toFixed(2)}</td>
      <td className="px-5 py-4"><StatusBadge status={item.status} /></td>
      <td className="px-5 py-3">{canManage && <div className="flex items-center justify-end gap-2"><button type="button" onClick={onEdit} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3 text-xs font-bold text-ink transition hover:bg-blue-50 hover:text-blue-700"><Pencil size={12} /> Edit</button><DeleteRecordButton item={item} organizationId={organizationId} module="suppliers" /></div>}</td>
    </tr>
  );
}

function ItemActions({ item, config, organizationId, canManage, onView, onEdit, mobile = false }: { item: OperationalItem; config: ModuleConfig; organizationId: string; canManage: boolean; onView?: () => void; onEdit: () => void; mobile?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${mobile ? "flex-wrap" : ""}`}>
      {config.key === "purchase_orders" && onView && <button type="button" onClick={onView} className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3 text-xs font-bold text-ink transition hover:bg-blue-50 hover:text-blue-700 ${mobile ? "flex-1" : ""}`}><Eye size={12} /> View</button>}
      {!item.immutable && canManage && config.statusOptions.length && config.key !== "purchase_orders" ? (
        <form action={updateOperationalStatus} className={`flex items-center gap-2 ${mobile ? "w-full" : ""}`}>
          <input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="module" value={config.key} /><input type="hidden" name="itemId" value={item.id} />
          <select name="status" defaultValue={item.status} className={`h-10 min-w-0 rounded-lg border border-line bg-white px-2 text-xs ${mobile ? "flex-1" : ""}`}>{config.statusOptions.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}</select>
          <AdminActionButton variant="secondary" className="h-10 px-3">Save</AdminActionButton>
        </form>
      ) : mobile ? null : <StatusBadge status={item.status} />}
      {!item.immutable && canManage && <button type="button" onClick={onEdit} className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3 text-xs font-bold text-ink transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 ${mobile ? "flex-1" : ""}`}><Pencil size={12} /> Edit</button>}
      {config.key === "products" && canManage && <form action={deleteOperationalItem} className={mobile ? "flex-1" : ""} onSubmit={(event) => { if (!window.confirm(`Delete ${item.title}? The product will be archived and its inventory history will be preserved.`)) event.preventDefault(); }}><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="module" value="products" /><input type="hidden" name="itemId" value={item.id} /><button type="submit" className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-xs font-bold text-red-700 transition hover:bg-red-50"><Trash2 size={12} /> Delete</button></form>}
      {config.key === "purchase_orders" && canManage && <DeleteRecordButton item={item} organizationId={organizationId} module="purchase_orders" className={mobile ? "flex-1" : ""} />}
      {config.key === "suppliers" && canManage && <DeleteRecordButton item={item} organizationId={organizationId} module="suppliers" className={mobile ? "flex-1" : ""} />}
      {config.key === "documents" && <form action={downloadDocument} className={mobile ? "w-full" : ""}><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="itemId" value={item.id} /><AdminActionButton variant="secondary" className={`h-10 px-3 ${mobile ? "w-full" : ""}`}><Download size={11} /> Download</AdminActionButton></form>}
    </div>
  );
}

function DeleteRecordButton({ item, organizationId, module, className }: { item: OperationalItem; organizationId: string; module: "purchase_orders" | "suppliers"; className?: string }) {
  const message = module === "suppliers" ? `Delete ${item.title}? The supplier will be archived and transaction history will be preserved.` : `Delete ${item.reference}? This cannot be undone.`;
  return <form action={deleteOperationalItem} className={className} onSubmit={(event) => { if (!window.confirm(message)) event.preventDefault(); }}><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="module" value={module} /><input type="hidden" name="itemId" value={item.id} /><button type="submit" className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-xs font-bold text-red-700 transition hover:bg-red-50"><Trash2 size={12} /> Delete</button></form>;
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) { const { label, ...rest } = props; return <label><span className={labelClass}>{label}</span><input className={fieldClass} {...rest} /></label>; }
function Select({ label, name, options, required, defaultValue, value, onChange, emptyLabel }: { label: string; name: string; options: ModuleOption[]; required?: boolean; defaultValue?: string; value?: string; onChange?: React.ChangeEventHandler<HTMLSelectElement>; emptyLabel?: string }) { return <label><span className={labelClass}>{label}</span><select name={name} required={required} defaultValue={value === undefined ? defaultValue : undefined} value={value} onChange={onChange} className={fieldClass}><option value="">{options.length === 0 && emptyLabel ? emptyLabel : required ? "Select one" : "None"}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.code} · {option.name}</option>)}</select></label>; }
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="border-b border-r border-line p-5"><p className="text-sm font-semibold text-muted">{label}</p><p className="mt-3 text-2xl font-bold tracking-[-.04em]">{value}</p><p className="mt-1 text-xs text-muted">{detail}</p></div>; }
function StatusBadge({ status }: { status: string }) { const danger = ["cancelled", "rejected", "exception", "inactive"].includes(status); const done = ["completed", "delivered", "verified", "active"].includes(status); return <span className={`rounded-full px-2 py-1 font-mono text-xs ${danger ? "bg-red-50 text-red-700" : done ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-800"}`}>{humanize(status).toUpperCase()}</span>; }
function humanize(value: string) { return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }
function formatNumber(value: number) { return new Intl.NumberFormat("en", { maximumFractionDigits: 4 }).format(value); }
function formatOperationalValue(value: number, config: ModuleConfig) { return isProcurement(config) ? formatPhpCurrency(value) : formatNumber(value); }
function isProcurement(config: ModuleConfig) { return ["requisitions", "rfqs", "quotations", "purchase_orders"].includes(config.key); }
function formatDate(value: string) { return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(value)); }
function toDateTimeLocal(value?: string | null) { if (!value) return undefined; const date = new Date(value); const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); }
