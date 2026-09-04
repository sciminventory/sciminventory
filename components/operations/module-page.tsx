"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  CircleAlert,
  FileUp,
  Filter,
  PackageOpen,
  Plus,
  Search,
  Download,
  X,
} from "lucide-react";
import { AdminActionButton } from "@/components/operations/admin-action-button";
import { ScrollReveal } from "@/components/motion/scroll-motion";
import { createOperationalItem, downloadDocument, updateOperationalStatus } from "@/app/(app)/dashboard/[...segments]/actions";
import { modulePaths, type ModuleConfig } from "@/lib/operations/modules";

export type OperationalItem = {
  id: string;
  reference: string;
  title: string;
  detail: string;
  status: string;
  quantity: number | null;
  dueAt: string | null;
  createdAt: string;
  warehouse: string | null;
  immutable?: boolean;
};

export type ModuleOption = { id: string; code: string; name: string };

type Props = {
  config: ModuleConfig;
  organizationId: string;
  role: string;
  items: OperationalItem[];
  warehouses: ModuleOption[];
  products: ModuleOption[];
  suppliers: ModuleOption[];
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
  const filtered = props.query
    ? props.items.filter((item) => `${item.reference} ${item.title} ${item.detail}`.toLowerCase().includes(props.query!.toLowerCase()))
    : props.items;
  const active = props.items.filter((item) => !["completed", "delivered", "inactive", "archived", "cancelled"].includes(item.status)).length;
  const completed = props.items.filter((item) => ["completed", "delivered", "verified"].includes(item.status)).length;
  const totalQuantity = props.items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);

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
          <Link href={modulePaths.movements} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-bold text-white hover:bg-blue-700 sm:w-auto">
            Post movement <ArrowRight size={13} />
          </Link>
        ) : props.canManage ? (
          <button type="button" onClick={() => setDrawerOpen(true)} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-bold text-white hover:bg-blue-700 sm:w-auto">
            <Plus size={14} /> {config.createLabel}
          </button>
        ) : (
          <span className="rounded-full border border-line bg-white px-3 py-2 font-mono text-xs uppercase text-muted">{props.role.replaceAll("_", " ")} · read only</span>
        )}
      </header>
      </ScrollReveal>

      {(props.success || props.error || props.setupError) && (
        <div role="status" className={`mt-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${props.error || props.setupError ? "border-red-200 bg-red-50 text-red-800" : "border-blue-200 bg-blue-50 text-blue-800"}`}>
          {props.error || props.setupError ? <CircleAlert className="mt-0.5 shrink-0" size={15} /> : <CheckCircle2 className="mt-0.5 shrink-0" size={15} />}
          <span>{props.error ?? props.setupError ?? props.success}</span>
        </div>
      )}

      <ScrollReveal className="mt-6" distance={16}>
      <div className="grid overflow-hidden rounded-2xl border border-line bg-white shadow-[0_14px_40px_rgba(25,72,133,.055)] sm:grid-cols-3">
        <Metric label="Total records" value={props.items.length.toLocaleString()} detail={`All ${config.title.toLowerCase()}`} />
        <Metric label="Active workflow" value={active.toLocaleString()} detail="Open or actionable" />
        <Metric label={config.quantityLabel ?? "Completed"} value={config.quantityLabel ? formatNumber(totalQuantity) : completed.toLocaleString()} detail={config.quantityLabel ? "Across visible records" : "Completed records"} />
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
                {props.query ? "Try a different reference or name." : config.readOnly ? "Post an inventory movement to establish the first live balance." : `Use “${config.createLabel}” to create the first workspace record.`}
              </p>
            </div>
          </div>
        ) : (
          <><div className="divide-y divide-line md:hidden">
            {filtered.map((item) => <ItemCard key={item.id} item={item} config={config} organizationId={props.organizationId} canManage={props.canManage} />)}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[820px] text-left">
              <thead className="border-b border-line bg-[#f8faff] font-mono text-xs uppercase tracking-wider text-muted">
                <tr><th className="px-5 py-3 font-medium">Reference</th><th className="px-5 py-3 font-medium">Record</th><th className="px-5 py-3 font-medium">Warehouse / context</th><th className="px-5 py-3 font-medium">Quantity</th><th className="px-5 py-3 font-medium">Created / due</th><th className="px-5 py-3 font-medium">Status / action</th></tr>
              </thead>
              <tbody>
                {filtered.map((item) => <ItemRow key={item.id} item={item} config={config} organizationId={props.organizationId} canManage={props.canManage} />)}
              </tbody>
            </table>
          </div></>
        )}
      </section>
      </ScrollReveal>

      <AnimatePresence>
        {drawerOpen && props.canManage && !config.readOnly && (
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
              aria-labelledby="create-drawer-title"
              className="fixed inset-y-0 right-0 z-[80] flex h-dvh w-full flex-col border-l border-line bg-[#f8faff] shadow-[-24px_0_70px_rgba(7,23,45,.18)] sm:max-w-[580px]"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              <div className="flex items-start gap-3 border-b border-line bg-white px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-accent"><PackageOpen size={19} /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs uppercase tracking-[.1em] text-blue-700">Create record</p>
                  <h2 id="create-drawer-title" className="mt-1 text-xl font-bold tracking-[-.035em]">New {config.singular}</h2>
                  <p className="mt-1 text-sm text-muted">Validated and securely scoped to your organization.</p>
                </div>
                <button type="button" onClick={() => setDrawerOpen(false)} className="grid size-10 shrink-0 place-items-center rounded-xl border border-line text-muted transition hover:bg-blue-50 hover:text-accent" aria-label="Close drawer"><X size={17} /></button>
              </div>
              <CreateForm config={config} organizationId={props.organizationId} warehouses={props.warehouses} products={props.products} suppliers={props.suppliers} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateForm({ config, organizationId, warehouses, products, suppliers }: { config: ModuleConfig; organizationId: string; warehouses: ModuleOption[]; products: ModuleOption[]; suppliers: ModuleOption[] }) {
  const relatedOptions = config.needsProduct ? products : config.needsSupplier ? suppliers : [];
  return (
    <form action={createOperationalItem} className="flex min-h-0 flex-1 flex-col">
      <div className="grid flex-1 content-start gap-5 overflow-y-auto p-4 sm:grid-cols-2 sm:p-6">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="module" value={config.key} />
      <Field label={config.referenceLabel} name="reference" placeholder={referencePlaceholder(config.key)} />
      {config.key === "movements" ? <input type="hidden" name="title" value="Inventory movement" /> : <Field label={config.titleLabel} name="title" placeholder={`Enter ${config.titleLabel.toLowerCase()}`} />}
      {config.needsWarehouse && <Select label={config.key === "transfers" ? "Source warehouse" : "Warehouse"} name="warehouseId" options={warehouses} required />}
      {config.needsSecondWarehouse && <Select label="Destination warehouse" name="destinationWarehouseId" options={warehouses} required />}
      {!config.needsSecondWarehouse && <input type="hidden" name="destinationWarehouseId" value="" />}
      {(config.needsProduct || config.needsSupplier) && <Select label={config.needsProduct ? "Product" : "Supplier"} name="relatedId" options={relatedOptions} required={config.needsProduct} />}
      {!config.needsProduct && !config.needsSupplier && <input type="hidden" name="relatedId" value="" />}
      <label><span className={labelClass}>{config.key === "locations" ? "Location type" : config.key === "movements" ? "Movement type" : "Initial status"}</span><select name="status" className={fieldClass}>{config.statusOptions.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}</select></label>
      {config.quantityLabel ? <Field label={config.quantityLabel} name="quantity" type="number" step="0.0001" min={config.key === "movements" ? undefined : 0} placeholder="0" required={config.key === "movements"} /> : <input type="hidden" name="quantity" value="" />}
      {!["products", "suppliers", "locations", "movements", "documents"].includes(config.key) && <Field label="Due date" name="dueAt" type="datetime-local" />}
      {["products", "suppliers", "locations", "movements", "documents"].includes(config.key) && <input type="hidden" name="dueAt" value="" />}
      <Field label={config.detailLabel ?? "Notes"} name="detail" type={config.key === "suppliers" ? "email" : "text"} placeholder={`Enter ${(config.detailLabel ?? "notes").toLowerCase()}`} />
      {config.key === "documents" && <label className="sm:col-span-2"><span className={labelClass}>File · max 25 MB</span><input required type="file" name="file" className="block h-10 w-full rounded-lg border border-line bg-white text-sm file:mr-3 file:h-full file:border-0 file:border-r file:border-line file:bg-blue-50 file:px-3 file:text-sm file:font-bold file:text-blue-700" /></label>}
      </div>
      <div className="border-t border-line bg-white p-5">
        <AdminActionButton className="h-11 w-full"><FileUp size={14} /> {config.createLabel}</AdminActionButton>
        <p className="mt-3 text-center text-xs text-muted">This action will be recorded in the workspace audit history.</p>
      </div>
    </form>
  );
}

function ItemCard({ item, config, organizationId, canManage }: { item: OperationalItem; config: ModuleConfig; organizationId: string; canManage: boolean }) {
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
        <div><dt className="text-muted">Quantity</dt><dd className="mt-1 font-mono font-semibold">{item.quantity === null ? "—" : formatNumber(item.quantity)}</dd></div>
        <div><dt className="text-muted">Created</dt><dd className="mt-1 font-mono font-semibold">{formatDate(item.createdAt)}</dd></div>
        <div><dt className="text-muted">Due</dt><dd className="mt-1 font-mono font-semibold">{item.dueAt ? formatDate(item.dueAt) : "Not set"}</dd></div>
      </dl>
      {(canManage || config.key === "documents") && <div className="mt-4"><ItemActions item={item} config={config} organizationId={organizationId} canManage={canManage} mobile /></div>}
    </article>
  );
}

function ItemRow({ item, config, organizationId, canManage }: { item: OperationalItem; config: ModuleConfig; organizationId: string; canManage: boolean }) {
  return (
    <tr className="border-b border-line text-sm last:border-0">
      <td className="px-5 py-4 font-mono font-medium text-blue-700">{item.reference}</td>
      <td className="max-w-xs px-5 py-4"><p className="font-bold">{item.title}</p><p className="mt-1 truncate text-xs text-muted">{item.detail || "No additional details"}</p></td>
      <td className="px-5 py-4 text-sm text-muted">{item.warehouse ?? "Organization-wide"}</td>
      <td className="px-5 py-4 font-mono">{item.quantity === null ? "—" : formatNumber(item.quantity)}</td>
      <td className="px-5 py-4"><p className="font-mono text-xs">{formatDate(item.createdAt)}</p>{item.dueAt && <p className="mt-1 text-xs text-muted">Due {formatDate(item.dueAt)}</p>}</td>
      <td className="px-5 py-3">
        <ItemActions item={item} config={config} organizationId={organizationId} canManage={canManage} />
      </td>
    </tr>
  );
}

function ItemActions({ item, config, organizationId, canManage, mobile = false }: { item: OperationalItem; config: ModuleConfig; organizationId: string; canManage: boolean; mobile?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${mobile ? "flex-wrap" : ""}`}>
      {!item.immutable && canManage && config.statusOptions.length ? (
        <form action={updateOperationalStatus} className={`flex items-center gap-2 ${mobile ? "w-full" : ""}`}>
          <input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="module" value={config.key} /><input type="hidden" name="itemId" value={item.id} />
          <select name="status" defaultValue={item.status} className={`h-10 min-w-0 rounded-lg border border-line bg-white px-2 text-xs ${mobile ? "flex-1" : ""}`}>{config.statusOptions.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}</select>
          <AdminActionButton variant="secondary" className="h-10 px-3">Save</AdminActionButton>
        </form>
      ) : mobile ? null : <StatusBadge status={item.status} />}
      {config.key === "documents" && <form action={downloadDocument} className={mobile ? "w-full" : ""}><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="itemId" value={item.id} /><AdminActionButton variant="secondary" className={`h-10 px-3 ${mobile ? "w-full" : ""}`}><Download size={11} /> Download</AdminActionButton></form>}
    </div>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) { const { label, ...rest } = props; return <label><span className={labelClass}>{label}</span><input className={fieldClass} {...rest} /></label>; }
function Select({ label, name, options, required }: { label: string; name: string; options: ModuleOption[]; required?: boolean }) { return <label><span className={labelClass}>{label}</span><select name={name} required={required} className={fieldClass}><option value="">{required ? "Select one" : "None"}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.code} · {option.name}</option>)}</select></label>; }
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="border-b border-r border-line p-5"><p className="text-sm font-semibold text-muted">{label}</p><p className="mt-3 text-2xl font-bold tracking-[-.04em]">{value}</p><p className="mt-1 text-xs text-muted">{detail}</p></div>; }
function StatusBadge({ status }: { status: string }) { const danger = ["cancelled", "rejected", "exception", "inactive"].includes(status); const done = ["completed", "delivered", "verified", "active"].includes(status); return <span className={`rounded-full px-2 py-1 font-mono text-xs ${danger ? "bg-red-50 text-red-700" : done ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-800"}`}>{humanize(status).toUpperCase()}</span>; }
function humanize(value: string) { return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }
function formatNumber(value: number) { return new Intl.NumberFormat("en", { maximumFractionDigits: 4 }).format(value); }
function formatDate(value: string) { return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(value)); }
function referencePlaceholder(key: string) { const prefixes: Record<string, string> = { products: "SKU-001", suppliers: "SUP-001", locations: "A-01-01", movements: "GRN-0001", transfers: "TR-0001", cycle_counts: "CC-0001", receiving: "RCV-0001", putaway: "PUT-0001", picking: "PICK-0001", requisitions: "PR-0001", rfqs: "RFQ-0001", quotations: "QT-0001", purchase_orders: "PO-0001", logistics: "SHP-0001", documents: "DOC-0001" }; return prefixes[key] ?? "REF-0001"; }
