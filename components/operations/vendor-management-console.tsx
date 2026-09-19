"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  Banknote,
  Boxes,
  Building2,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  Gauge,
  History,
  MessageSquare,
  Pencil,
  PackageCheck,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Truck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { AdminActionButton } from "@/components/operations/admin-action-button";
import { ScrollReveal } from "@/components/motion/scroll-motion";
import { ToastNotification } from "@/components/ui/toast-notification";
import { VendorRealtimeSync } from "@/components/vendor/vendor-realtime-sync";
import {
  addPurchaseOrderLine,
  addVendorCatalogItem,
  addVendorImprovementPlan,
  addVendorReview,
  calculateVendorPerformance,
  createVendor,
  createVendorConversation,
  archiveVendorContact,
  generateReorderRequisitions,
  inviteVendorUser,
  issuePurchaseOrder,
  matchVendorInvoice,
  recordGoodsReceipt,
  recordVendorPayment,
  reviewVendor,
  saveVendorContact,
  sendVendorMessage,
  updateVendorMasterData,
  verifyVendorDocument,
} from "@/app/(app)/dashboard/vendors/actions";
import { hasPermission, type OrganizationRole } from "@/lib/auth/permissions";
import { formatPhpCurrency } from "@/lib/utils";
import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];
type Row<K extends keyof Tables> = Tables[K]["Row"];
type Vendor = Row<"suppliers">;
type Activity = Database["public"]["Views"]["vendor_activity_history"]["Row"];
type Tab =
  | "overview"
  | "catalog"
  | "orders"
  | "logistics"
  | "billing"
  | "messages"
  | "performance"
  | "history";

type Props = {
  preview?: boolean;
  organizationId?: string;
  organizationSlug?: string;
  role?: OrganizationRole;
  selectedVendorId?: string;
  initialTab?: string;
  selectedConversationId?: string;
  success?: string;
  error?: string;
  setupError?: string;
  vendors?: Vendor[];
  vendorUsers?: Row<"vendor_users">[];
  contacts?: Row<"vendor_contacts">[];
  addresses?: Row<"vendor_addresses">[];
  shippingRules?: Row<"vendor_shipping_rules">[];
  documents?: Row<"vendor_documents">[];
  catalog?: Row<"vendor_catalog_items">[];
  orders?: Row<"procurement_records">[];
  orderLines?: Row<"procurement_record_lines">[];
  shipments?: Row<"shipments">[];
  shipmentLines?: Row<"shipment_lines">[];
  shipmentEvents?: Row<"shipment_events">[];
  invoices?: Row<"vendor_invoices">[];
  payments?: Row<"payment_records">[];
  performance?: Row<"vendor_performance_snapshots">[];
  reviews?: Row<"vendor_reviews">[];
  improvements?: Row<"vendor_improvement_plans">[];
  activity?: Activity[];
  conversations?: Row<"vendor_conversations">[];
  messages?: Row<"vendor_messages">[];
  fileUrls?: Record<string, string>;
  products?: Array<{ id: string; sku: string; name: string }>;
  warehouses?: Array<{ id: string; code: string; name: string }>;
};

const tabs: Array<{ key: Tab; label: string; icon: typeof Building2 }> = [
  { key: "overview", label: "Overview", icon: Building2 },
  { key: "catalog", label: "Catalog", icon: Boxes },
  { key: "orders", label: "Orders", icon: ClipboardCheck },
  { key: "logistics", label: "Logistics", icon: Truck },
  { key: "billing", label: "Billing", icon: Banknote },
  { key: "messages", label: "Messages", icon: MessageSquare },
  { key: "performance", label: "Performance", icon: Gauge },
  { key: "history", label: "History", icon: History },
];

export function VendorManagementConsole(props: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(
    tabs.some((item) => item.key === props.initialTab)
      ? (props.initialTab as Tab)
      : "overview",
  );
  const vendors = props.vendors ?? [];
  const selected =
    vendors.find((vendor) => vendor.id === props.selectedVendorId) ??
    vendors[0];
  const canManage = props.role
    ? hasPermission(props.role, "vendors.manage")
    : true;
  const approved = vendors.filter(
    (vendor) => vendor.onboarding_status === "approved",
  ).length;
  const pending = vendors.filter((vendor) =>
    ["submitted", "under_review", "changes_requested"].includes(
      vendor.onboarding_status,
    ),
  ).length;
  const atRisk = vendors.filter((vendor) =>
    ["medium", "high"].includes(vendor.risk_rating),
  ).length;
  const overdueInvoices = (props.invoices ?? []).filter(
    (invoice) =>
      invoice.status !== "paid" && new Date(invoice.due_date) < new Date(),
  ).length;

  if (props.preview)
    return (
      <main className="p-6 lg:p-10">
        <Empty
          title="Vendor management preview"
          body="Connect the workspace backend and apply migration 013 to activate vendor onboarding and portal workflows."
        />
      </main>
    );

  return (
    <main className="min-w-0 p-4 sm:p-6 lg:p-10">
      <ScrollReveal>
        <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-xs uppercase tracking-[.12em] text-blue-700">
                Procurement · Partner network
              </p>
              {props.organizationId && (
                <VendorRealtimeSync
                  organizationId={props.organizationId}
                  badge
                />
              )}
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-[-.05em] sm:text-4xl">
              Vendor management
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Qualify partners, control orders, receive goods, reconcile
              invoices, and improve performance from one auditable workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {props.organizationSlug && (
              <Link
                href={`/vendors/apply/${props.organizationSlug}`}
                target="_blank"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-bold"
              >
                <Building2 size={14} /> Public application
              </Link>
            )}
            {canManage && (
              <form action={generateReorderRequisitions}>
                <input
                  type="hidden"
                  name="organizationId"
                  value={props.organizationId}
                />
                <AdminActionButton variant="secondary">
                  <RefreshCw size={14} /> Generate reorder requests
                </AdminActionButton>
              </form>
            )}
            {canManage && (
              <button
                onClick={() => setDrawerOpen(true)}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-white shadow-[0_14px_34px_rgba(37,99,235,.2)]"
              >
                <Plus size={15} /> Add vendor
              </button>
            )}
          </div>
        </header>
      </ScrollReveal>

      <ToastNotification
        success={props.success}
        error={props.error}
        setupError={props.setupError}
      />

      <ScrollReveal className="mt-6">
        <div className="grid overflow-hidden rounded-2xl border border-line bg-white shadow-sm sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="All vendors"
            value={vendors.length}
            detail="Partner master"
          />
          <Metric
            label="Approved"
            value={approved}
            detail="Transaction ready"
          />
          <Metric
            label="Pending review"
            value={pending}
            detail="Needs action"
          />
          <Metric
            label="Risk / overdue"
            value={atRisk + overdueInvoices}
            detail={`${atRisk} vendor · ${overdueInvoices} invoice`}
          />
        </div>
      </ScrollReveal>

      <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <ScrollReveal>
          <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-bold">Vendor directory</h2>
              <p className="mt-1 text-xs text-muted">
                {vendors.length} standardized profiles
              </p>
            </div>
            <div className="max-h-[680px] overflow-y-auto p-2">
              {vendors.map((vendor) => (
                <Link
                  key={vendor.id}
                  href={`/dashboard/vendors?vendor=${vendor.id}`}
                  className={`mb-1 flex items-center gap-3 rounded-xl p-3 transition ${selected?.id === vendor.id ? "bg-blue-50 text-blue-800" : "hover:bg-mist"}`}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white font-mono text-xs font-bold shadow-sm">
                    {vendor.code.slice(0, 2)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">
                      {vendor.name}
                    </strong>
                    <span className="mt-1 block truncate text-xs text-muted">
                      {humanize(vendor.vendor_category)}
                    </span>
                  </span>
                  <ChevronRight size={14} />
                </Link>
              ))}
              {!vendors.length && (
                <Empty
                  title="No vendors yet"
                  body="Create the first vendor application to start onboarding."
                  compact
                />
              )}
            </div>
          </section>
        </ScrollReveal>

        {selected ? (
          <ScrollReveal>
            <section className="min-w-0 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
              <div className="border-b border-line p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-sm font-bold text-white">
                    {selected.code.slice(0, 2)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold">{selected.name}</h2>
                      <Status value={selected.onboarding_status} />
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {selected.legal_name ?? selected.name} · {selected.code}
                    </p>
                  </div>
                  <div className="sm:ml-auto">
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold">
                      Risk: {humanize(selected.risk_rating)}
                    </span>
                  </div>
                </div>
                <div className="mt-5 flex gap-1 overflow-x-auto rounded-xl bg-mist p-1">
                  {tabs.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setTab(key)}
                      className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${tab === key ? "bg-white text-blue-700 shadow-sm" : "text-muted"}`}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-5 sm:p-6"
                >
                  {tab === "overview" && (
                    <Overview
                      {...props}
                      vendor={selected}
                      canManage={canManage}
                    />
                  )}
                  {tab === "catalog" && (
                    <Catalog
                      {...props}
                      vendor={selected}
                      canManage={canManage}
                    />
                  )}
                  {tab === "orders" && (
                    <Orders
                      {...props}
                      vendor={selected}
                      canManage={canManage}
                    />
                  )}
                  {tab === "logistics" && (
                    <Logistics
                      {...props}
                      vendor={selected}
                      canManage={canManage}
                    />
                  )}
                  {tab === "billing" && (
                    <Billing
                      {...props}
                      vendor={selected}
                      canManage={canManage}
                    />
                  )}
                  {tab === "messages" && (
                    <Messages {...props} vendor={selected} />
                  )}
                  {tab === "performance" && (
                    <Performance
                      {...props}
                      vendor={selected}
                      canManage={canManage}
                    />
                  )}
                  {tab === "history" && (
                    <VendorHistory {...props} vendor={selected} />
                  )}
                </motion.div>
              </AnimatePresence>
            </section>
          </ScrollReveal>
        ) : (
          <Empty
            title="Select a vendor"
            body="Vendor details and workflows will appear here."
          />
        )}
      </div>

      <AnimatePresence>
        {drawerOpen && (
          <Drawer
            title="Create vendor application"
            onClose={() => setDrawerOpen(false)}
          >
            <form
              action={createVendor}
              className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6"
            >
              <input
                type="hidden"
                name="organizationId"
                value={props.organizationId}
              />
              <Field
                name="code"
                label="Vendor code"
                required
                placeholder="VND-001"
              />
              <Field name="name" label="Trading name" required />
              <Field name="legalName" label="Legal name" required />
              <Field name="email" label="Contact email" type="email" required />
              <Field name="phone" label="Phone" />
              <Select
                name="category"
                label="Category"
                values={[
                  "raw_material",
                  "finished_goods",
                  "spare_parts",
                  "logistics_provider",
                  "services",
                ]}
              />
              <Field name="taxId" label="Tax ID" />
              <Field name="registrationNumber" label="Registration number" />
              <Field
                name="paymentTermsDays"
                label="Payment terms (days)"
                type="number"
                defaultValue="30"
                min="0"
              />
              <Field
                name="creditLimit"
                label="Credit limit (₱)"
                type="number"
                defaultValue="0"
                min="0"
              />
              <Field
                name="leadTimeDays"
                label="Lead time (days)"
                type="number"
                defaultValue="0"
                min="0"
              />
              <Field
                name="deliveryCapacity"
                label="Delivery capacity"
                type="number"
                defaultValue="0"
                min="0"
              />
              <Field
                name="serviceAreas"
                label="Service areas · comma separated"
                className="sm:col-span-2"
              />
              <Field
                name="deliveryMethods"
                label="Delivery methods · comma separated"
                className="sm:col-span-2"
              />
              <Field
                name="address"
                label="Business address"
                className="sm:col-span-2"
              />
              <Field name="city" label="City" />
              <div className="sm:col-span-2">
                <AdminActionButton className="w-full">
                  Create vendor application
                </AdminActionButton>
              </div>
            </form>
          </Drawer>
        )}
      </AnimatePresence>
    </main>
  );
}

function Overview(props: Props & { vendor: Vendor; canManage: boolean }) {
  const { vendor } = props;
  const users = (props.vendorUsers ?? []).filter(
    (row) => row.supplier_id === vendor.id,
  );
  const contacts = (props.contacts ?? []).filter(
    (row) => row.supplier_id === vendor.id,
  );
  const activeContacts = contacts.filter((contact) => contact.is_active);
  const addresses = (props.addresses ?? []).filter(
    (row) => row.supplier_id === vendor.id,
  );
  const shippingRules = (props.shippingRules ?? []).filter(
    (row) => row.supplier_id === vendor.id,
  );
  const docs = (props.documents ?? []).filter(
    (row) => row.supplier_id === vendor.id,
  );
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Company profile">
        <Info label="Category" value={humanize(vendor.vendor_category)} />
        <Info label="Contact" value={vendor.contact_email ?? "Not provided"} />
        <Info
          label="Terms"
          value={`Net ${vendor.payment_terms_days} · ${formatPhpCurrency(vendor.credit_limit)} credit`}
        />
        <Info
          label="Delivery"
          value={`${vendor.lead_time_days ?? 0} days · ${vendor.service_areas.join(", ") || "No service area"}`}
        />
        <Info
          label="Address"
          value={
            [vendor.address_line, vendor.city, vendor.province]
              .filter(Boolean)
              .join(", ") || "Not provided"
          }
        />
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Mini label="Contacts" value={activeContacts.length} />
          <Mini label="Addresses" value={addresses.length} />
          <Mini label="Shipping rules" value={shippingRules.length} />
        </div>
        {props.canManage && (
          <details className="mt-5 rounded-xl border border-line bg-mist p-4">
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-bold">
              <Pencil size={14} /> Edit supplier information
            </summary>
            <form
              action={updateVendorMasterData}
              className="mt-5 grid gap-3 sm:grid-cols-2"
            >
              <Hidden org={props.organizationId} vendor={vendor.id} />
              <Field
                name="code"
                label="Vendor code"
                defaultValue={vendor.code}
                required
              />
              <Field
                name="name"
                label="Trading name"
                defaultValue={vendor.name}
                required
              />
              <Field
                name="legalName"
                label="Legal name"
                defaultValue={vendor.legal_name ?? vendor.name}
                required
              />
              <Field
                name="email"
                label="Contact email"
                type="email"
                defaultValue={vendor.contact_email ?? ""}
                required
              />
              <Field
                name="phone"
                label="Phone"
                defaultValue={vendor.phone ?? ""}
              />
              <Select
                name="category"
                label="Category"
                values={[
                  "raw_material",
                  "finished_goods",
                  "spare_parts",
                  "logistics_provider",
                  "services",
                ]}
                defaultValue={vendor.vendor_category}
              />
              <Field
                name="taxId"
                label="Tax ID"
                defaultValue={vendor.tax_id ?? ""}
              />
              <Field
                name="registrationNumber"
                label="Registration number"
                defaultValue={vendor.registration_number ?? ""}
              />
              <Field
                name="paymentTermsDays"
                label="Payment terms (days)"
                type="number"
                min="0"
                max="365"
                defaultValue={vendor.payment_terms_days}
              />
              <Field
                name="creditLimit"
                label="Credit limit (₱)"
                type="number"
                min="0"
                step="0.01"
                defaultValue={vendor.credit_limit}
              />
              <Field
                name="leadTimeDays"
                label="Lead time (days)"
                type="number"
                min="0"
                defaultValue={vendor.lead_time_days ?? 0}
              />
              <Field
                name="deliveryCapacity"
                label="Delivery capacity"
                type="number"
                min="0"
                step="0.0001"
                defaultValue={vendor.delivery_capacity ?? 0}
              />
              <Field
                name="website"
                label="Website"
                defaultValue={vendor.website ?? ""}
              />
              <Field
                name="countryCode"
                label="Country code"
                defaultValue={vendor.country_code}
                maxLength={2}
                required
              />
              <Field
                name="address"
                label="Business address"
                defaultValue={vendor.address_line ?? ""}
                className="sm:col-span-2"
              />
              <Field
                name="city"
                label="City"
                defaultValue={vendor.city ?? ""}
              />
              <Field
                name="province"
                label="Province"
                defaultValue={vendor.province ?? ""}
              />
              <Field
                name="postalCode"
                label="Postal code"
                defaultValue={vendor.postal_code ?? ""}
              />
              <Field
                name="serviceAreas"
                label="Service areas · comma separated"
                defaultValue={vendor.service_areas.join(", ")}
                className="sm:col-span-2"
              />
              <Field
                name="deliveryMethods"
                label="Delivery methods · comma separated"
                defaultValue={vendor.delivery_methods.join(", ")}
                className="sm:col-span-2"
              />
              <div className="sm:col-span-2">
                <AdminActionButton className="w-full">
                  Save supplier information
                </AdminActionButton>
              </div>
            </form>
          </details>
        )}
      </Panel>
      <Panel title="Supplier contacts">
        <div className="space-y-3">
          {contacts.map((contact) => (
            <article
              key={contact.id}
              className={`rounded-xl border p-3 ${contact.is_active ? "border-line" : "border-slate-200 bg-slate-50 opacity-70"}`}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm">{contact.full_name}</strong>
                    {contact.is_primary && <Status value="primary" />}
                    {!contact.is_active && <Status value="archived" />}
                  </div>
                  <p className="mt-1 break-all text-xs text-muted">
                    {contact.job_title || "Contact"} · {contact.email}
                    {contact.phone ? ` · ${contact.phone}` : ""}
                  </p>
                </div>
              </div>
              {props.canManage && contact.is_active && (
                <details className="mt-3 rounded-lg bg-mist p-3">
                  <summary className="cursor-pointer text-xs font-bold">
                    Edit contact
                  </summary>
                  <form
                    action={saveVendorContact}
                    className="mt-3 grid gap-3 sm:grid-cols-2"
                  >
                    <Hidden org={props.organizationId} vendor={vendor.id} />
                    <input type="hidden" name="contactId" value={contact.id} />
                    <Field
                      name="fullName"
                      label="Full name"
                      defaultValue={contact.full_name}
                      required
                    />
                    <Field
                      name="email"
                      label="Email"
                      type="email"
                      defaultValue={contact.email}
                      required
                    />
                    <Field
                      name="phone"
                      label="Phone"
                      defaultValue={contact.phone ?? ""}
                    />
                    <Field
                      name="jobTitle"
                      label="Job title"
                      defaultValue={contact.job_title ?? ""}
                    />
                    <Check
                      name="isPrimary"
                      label="Primary contact"
                      defaultChecked={contact.is_primary}
                    />
                    <input type="hidden" name="isActive" value="on" />
                    <AdminActionButton>
                      <Pencil size={14} /> Save contact
                    </AdminActionButton>
                  </form>
                  <form action={archiveVendorContact} className="mt-3">
                    <Hidden org={props.organizationId} vendor={vendor.id} />
                    <input type="hidden" name="contactId" value={contact.id} />
                    <button className="inline-flex items-center gap-2 text-xs font-bold text-red-700">
                      <Trash2 size={13} /> Archive contact
                    </button>
                  </form>
                </details>
              )}
              {props.canManage && !contact.is_active && (
                <form action={saveVendorContact} className="mt-3">
                  <Hidden org={props.organizationId} vendor={vendor.id} />
                  <input type="hidden" name="contactId" value={contact.id} />
                  <input
                    type="hidden"
                    name="fullName"
                    value={contact.full_name}
                  />
                  <input type="hidden" name="email" value={contact.email} />
                  <input
                    type="hidden"
                    name="phone"
                    value={contact.phone ?? ""}
                  />
                  <input
                    type="hidden"
                    name="jobTitle"
                    value={contact.job_title ?? ""}
                  />
                  <input type="hidden" name="isActive" value="on" />
                  <button className="text-xs font-bold text-blue-700">
                    Restore contact
                  </button>
                </form>
              )}
            </article>
          ))}
          {!contacts.length && (
            <p className="py-4 text-center text-sm text-muted">
              No supplier contacts have been added.
            </p>
          )}
        </div>
        {props.canManage && (
          <details className="mt-4 rounded-xl bg-blue-50 p-4">
            <summary className="cursor-pointer text-sm font-bold text-blue-800">
              Add contact
            </summary>
            <form
              action={saveVendorContact}
              className="mt-4 grid gap-3 sm:grid-cols-2"
            >
              <Hidden org={props.organizationId} vendor={vendor.id} />
              <input type="hidden" name="contactId" value="" />
              <input type="hidden" name="isActive" value="on" />
              <Field name="fullName" label="Full name" required />
              <Field name="email" label="Email" type="email" required />
              <Field name="phone" label="Phone" />
              <Field name="jobTitle" label="Job title" />
              <Check
                name="isPrimary"
                label="Primary contact"
                defaultChecked={!activeContacts.length}
              />
              <AdminActionButton>Add contact</AdminActionButton>
            </form>
          </details>
        )}
      </Panel>
      <Panel title="Compliance">
        <div className="grid grid-cols-2 gap-3">
          <Mini label="Documents" value={docs.length} />
          <Mini
            label="Verified"
            value={docs.filter((doc) => doc.status === "verified").length}
          />
          <Mini label="Portal users" value={users.length} />
          <Mini
            label="Active users"
            value={users.filter((user) => user.status === "active").length}
          />
        </div>
        {docs.slice(0, 6).map((doc) => (
          <div key={doc.id} className="mt-3 rounded-xl bg-mist p-3">
            <div className="flex items-center gap-3">
              <FileCheck2 size={16} className="text-blue-700" />
              <span className="min-w-0 flex-1 truncate text-sm">
                {doc.title}
              </span>
              <Status value={doc.status} />
            </div>
            {props.fileUrls?.[doc.storage_path] && (
              <a
                href={props.fileUrls[doc.storage_path]}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs font-bold text-blue-700 hover:underline"
              >
                Open secure document
              </a>
            )}
            {props.canManage && doc.status === "submitted" && (
              <form
                action={verifyVendorDocument}
                className="mt-3 flex flex-wrap gap-2"
              >
                <Hidden org={props.organizationId} vendor={vendor.id} />
                <input type="hidden" name="documentId" value={doc.id} />
                <button
                  name="status"
                  value="verified"
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                >
                  Verify
                </button>
                <button
                  name="status"
                  value="rejected"
                  className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700"
                >
                  Reject
                </button>
              </form>
            )}
          </div>
        ))}
      </Panel>
      {props.canManage && (
        <Panel title="Review and approve">
          <form action={reviewVendor} className="space-y-3">
            <Hidden org={props.organizationId} vendor={vendor.id} />
            <Select
              name="onboardingStatus"
              label="Decision"
              values={[
                "under_review",
                "changes_requested",
                "approved",
                "rejected",
                "suspended",
                "archived",
              ]}
              defaultValue={vendor.onboarding_status}
            />
            <Select
              name="riskRating"
              label="Risk rating"
              values={["unrated", "low", "medium", "high"]}
              defaultValue={vendor.risk_rating}
            />
            <TextArea
              name="notes"
              label="Review notes"
              defaultValue={vendor.notes ?? ""}
            />
            <AdminActionButton className="w-full">
              <ShieldCheck size={14} /> Save review
            </AdminActionButton>
          </form>
        </Panel>
      )}
      {props.canManage && (
        <Panel title="Invite portal user">
          <form action={inviteVendorUser} className="space-y-3">
            <Hidden org={props.organizationId} vendor={vendor.id} />
            <Field name="fullName" label="Full name" required />
            <Field name="email" label="Email" type="email" required />
            <Select
              name="role"
              label="Portal role"
              values={["admin", "member", "finance", "logistics"]}
            />
            <AdminActionButton className="w-full">
              <UserPlus size={14} /> Send secure invitation
            </AdminActionButton>
          </form>
        </Panel>
      )}
    </div>
  );
}

function Catalog(props: Props & { vendor: Vendor; canManage: boolean }) {
  const rows = (props.catalog ?? []).filter(
    (row) => row.supplier_id === props.vendor.id,
  );
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <Panel title="Vendor catalog">
        {rows.map((row) => (
          <article
            key={row.id}
            className="border-b border-line py-4 first:pt-0 last:border-0"
          >
            <div className="flex gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">{row.description}</h3>
                <p className="mt-1 font-mono text-xs text-blue-700">
                  {row.vendor_item_code}
                </p>
              </div>
              <strong>{formatPhpCurrency(row.unit_price)}</strong>
            </div>
            <p className="mt-2 text-xs text-muted">
              MOQ {row.minimum_order_quantity} · Lead {row.lead_time_days} days
              · {row.packaging_specs || "Standard packaging"}
            </p>
          </article>
        ))}
        {!rows.length && (
          <Empty
            title="No catalog items"
            body="Map the vendor's first product or service."
            compact
          />
        )}
      </Panel>
      {props.canManage && (
        <Panel title="Add catalog item">
          <form action={addVendorCatalogItem} className="space-y-3">
            <Hidden org={props.organizationId} vendor={props.vendor.id} />
            <SelectOptions
              name="productId"
              label="Internal product mapping"
              options={(props.products ?? []).map((p) => ({
                value: p.id,
                label: `${p.sku} · ${p.name}`,
              }))}
              optional
            />
            <Field name="itemCode" label="Vendor item code" required />
            <Field name="description" label="Description" required />
            <Field
              name="unitPrice"
              label="Unit price (₱)"
              type="number"
              min="0"
              step="0.01"
              required
            />
            <Field
              name="moq"
              label="Minimum order quantity"
              type="number"
              min="0.0001"
              step="0.0001"
              defaultValue="1"
              required
            />
            <Field
              name="leadTimeDays"
              label="Lead time (days)"
              type="number"
              min="0"
              defaultValue="0"
            />
            <Field
              name="deliveryWindowDays"
              label="Delivery window (days)"
              type="number"
              min="0"
              defaultValue="0"
            />
            <Field name="packagingSpecs" label="Packaging specifications" />
            <AdminActionButton className="w-full">
              Add catalog item
            </AdminActionButton>
          </form>
        </Panel>
      )}
    </div>
  );
}

function Orders(props: Props & { vendor: Vendor; canManage: boolean }) {
  const orders = (props.orders ?? []).filter(
    (row) => row.supplier_id === props.vendor.id,
  );
  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const lines = (props.orderLines ?? []).filter(
          (line) => line.procurement_record_id === order.id,
        );
        return (
          <Panel
            key={order.id}
            title={`${order.reference} · ${order.title}`}
            action={<Status value={order.status} />}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <Mini
                label="Value"
                value={formatPhpCurrency(Number(order.amount ?? 0))}
              />
              <Mini
                label="Delivery"
                value={
                  order.delivery_date ?? order.due_at?.slice(0, 10) ?? "Not set"
                }
              />
              <Mini label="Version" value={`v${order.version}`} />
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[540px] text-left text-sm">
                <thead className="text-xs uppercase text-muted">
                  <tr>
                    <th className="py-2">Item</th>
                    <th>Qty</th>
                    <th>Received</th>
                    <th>Unit price</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.id} className="border-t border-line">
                      <td className="py-3">{line.description}</td>
                      <td>{line.quantity}</td>
                      <td>{line.received_quantity}</td>
                      <td>{formatPhpCurrency(line.unit_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {props.canManage && (
              <details className="mt-4 rounded-xl bg-mist p-3">
                <summary className="cursor-pointer text-sm font-bold">
                  Add PO line
                </summary>
                <form
                  action={addPurchaseOrderLine}
                  className="mt-4 grid gap-3 sm:grid-cols-2"
                >
                  <Hidden org={props.organizationId} vendor={props.vendor.id} />
                  <input
                    type="hidden"
                    name="purchaseOrderId"
                    value={order.id}
                  />
                  <SelectOptions
                    name="productId"
                    label="Product"
                    options={(props.products ?? []).map((p) => ({
                      value: p.id,
                      label: `${p.sku} · ${p.name}`,
                    }))}
                    optional
                  />
                  <Field name="description" label="Description" required />
                  <Field
                    name="quantity"
                    label="Quantity"
                    type="number"
                    min="0.0001"
                    step="0.0001"
                    required
                  />
                  <Field
                    name="unitPrice"
                    label="Unit price (₱)"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                  />
                  <Field
                    name="taxRate"
                    label="Tax rate (%)"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue="0"
                  />
                  <Field
                    name="promisedDate"
                    label="Promised date"
                    type="date"
                  />
                  <AdminActionButton>Add line</AdminActionButton>
                </form>
              </details>
            )}
            {props.canManage &&
              ["draft", "approved", "revised"].includes(order.status) && (
                <form action={issuePurchaseOrder} className="mt-3">
                  <Hidden org={props.organizationId} vendor={props.vendor.id} />
                  <input
                    type="hidden"
                    name="purchaseOrderId"
                    value={order.id}
                  />
                  <AdminActionButton>
                    <Send size={14} /> Issue to vendor
                  </AdminActionButton>
                </form>
              )}
          </Panel>
        );
      })}
      {!orders.length && (
        <Empty
          title="No purchase orders"
          body="Create a purchase order from Procurement and assign this vendor."
        />
      )}
    </div>
  );
}

function Logistics(props: Props & { vendor: Vendor; canManage: boolean }) {
  const shipments = (props.shipments ?? []).filter(
    (row) => row.supplier_id === props.vendor.id,
  );
  return (
    <div className="space-y-4">
      {shipments.map((shipment) => (
        <Panel
          key={shipment.id}
          title={`${shipment.reference} · ${shipment.title}`}
          action={<Status value={shipment.status} />}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Mini label="Carrier" value={shipment.carrier ?? "Not assigned"} />
            <Mini
              label="Tracking"
              value={shipment.tracking_number ?? "Not provided"}
            />
            <Mini
              label="ETA"
              value={
                shipment.expected_arrival_at?.slice(0, 16).replace("T", " ") ??
                "Not set"
              }
            />
          </div>
          <ShipmentTimeline
            events={(props.shipmentEvents ?? []).filter(
              (event) => event.shipment_id === shipment.id,
            )}
          />
          {(props.shipmentLines ?? [])
            .filter((line) => line.shipment_id === shipment.id)
            .map((line) => (
              <article
                key={line.id}
                className="mt-4 rounded-xl border border-line p-4"
              >
                <div className="flex justify-between gap-3">
                  <span className="font-semibold">{line.description}</span>
                  <span className="font-mono text-sm">
                    {line.received_quantity}/{line.quantity}
                  </span>
                </div>
                {props.canManage && line.received_quantity < line.quantity && (
                  <form
                    action={recordGoodsReceipt}
                    className="mt-4 grid gap-3 sm:grid-cols-2"
                  >
                    <Hidden
                      org={props.organizationId}
                      vendor={props.vendor.id}
                    />
                    <input
                      type="hidden"
                      name="shipmentLineId"
                      value={line.id}
                    />
                    <Field
                      name="reference"
                      label="Receipt reference"
                      placeholder="GRN-0001"
                      required
                    />
                    <Field
                      name="acceptedQuantity"
                      label="Accepted quantity"
                      type="number"
                      min="0"
                      step="0.0001"
                      defaultValue="0"
                    />
                    <Field
                      name="rejectedQuantity"
                      label="Rejected quantity"
                      type="number"
                      min="0"
                      step="0.0001"
                      defaultValue="0"
                    />
                    <Field
                      name="rejectionReason"
                      label="Rejection / shortage reason"
                    />
                    <Check name="qualityOk" label="Quality accepted" />
                    <Check name="conditionOk" label="Condition accepted" />
                    <Check name="packagingOk" label="Packaging accepted" />
                    <AdminActionButton>
                      <PackageCheck size={14} /> Post receipt
                    </AdminActionButton>
                  </form>
                )}
              </article>
            ))}
        </Panel>
      ))}
      {!shipments.length && (
        <Empty
          title="No shipments"
          body="Shipments created by the vendor will appear here for receiving."
        />
      )}
    </div>
  );
}

function Billing(props: Props & { vendor: Vendor; canManage: boolean }) {
  const invoices = (props.invoices ?? []).filter(
    (row) => row.supplier_id === props.vendor.id,
  );
  return (
    <div className="space-y-4">
      {invoices.map((invoice) => {
        const invoicePayments = (props.payments ?? []).filter(
          (payment) => payment.invoice_id === invoice.id,
        );
        return (
          <Panel
            key={invoice.id}
            title={`Invoice ${invoice.invoice_number}`}
            action={<Status value={invoice.status} />}
          >
            <div className="grid gap-3 sm:grid-cols-4">
              <Mini
                label="Total"
                value={formatPhpCurrency(invoice.total_amount)}
              />
              <Mini label="Invoice date" value={invoice.invoice_date} />
              <Mini label="Due date" value={invoice.due_date} />
              <Mini
                label="Paid"
                value={formatPhpCurrency(
                  invoicePayments
                    .filter((p) => p.status === "paid")
                    .reduce((sum, p) => sum + Number(p.amount), 0),
                )}
              />
            </div>
            {invoice.mismatch_reason && (
              <p className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle size={16} />
                {invoice.mismatch_reason}
              </p>
            )}
            {props.canManage &&
              ["submitted", "matching", "exception"].includes(
                invoice.status,
              ) && (
                <form action={matchVendorInvoice} className="mt-4">
                  <Hidden org={props.organizationId} vendor={props.vendor.id} />
                  <input type="hidden" name="invoiceId" value={invoice.id} />
                  <AdminActionButton variant="secondary">
                    <ClipboardCheck size={14} /> Run three-way match
                  </AdminActionButton>
                </form>
              )}
            {props.canManage && invoice.status === "approved" && (
              <details className="mt-4 rounded-xl bg-mist p-3">
                <summary className="cursor-pointer text-sm font-bold">
                  Record payment
                </summary>
                <form
                  action={recordVendorPayment}
                  className="mt-4 grid gap-3 sm:grid-cols-2"
                >
                  <Hidden org={props.organizationId} vendor={props.vendor.id} />
                  <input type="hidden" name="invoiceId" value={invoice.id} />
                  <Field name="reference" label="Payment reference" required />
                  <Field
                    name="amount"
                    label="Amount (₱)"
                    type="number"
                    min="0.01"
                    step="0.01"
                    defaultValue={invoice.total_amount}
                    required
                  />
                  <Field name="paymentMethod" label="Payment method" />
                  <Select
                    name="status"
                    label="Status"
                    values={["pending", "approved", "scheduled", "paid"]}
                  />
                  <AdminActionButton>Save payment</AdminActionButton>
                </form>
              </details>
            )}
          </Panel>
        );
      })}
      {!invoices.length && (
        <Empty
          title="No invoices"
          body="Vendor-submitted invoices will appear here for matching and payment."
        />
      )}
    </div>
  );
}

function Messages(props: Props & { vendor: Vendor }) {
  const threads = (props.conversations ?? []).filter(
    (thread) => thread.supplier_id === props.vendor.id,
  );
  const [selectedId, setSelectedId] = useState(
    props.selectedConversationId ?? threads[0]?.id ?? "",
  );
  const [contextType, setContextType] = useState<
    "general" | "purchase_order" | "shipment" | "invoice"
  >("general");
  const selected =
    threads.find((thread) => thread.id === selectedId) ?? threads[0];
  const threadMessages = (props.messages ?? []).filter(
    (message) => message.conversation_id === selected?.id,
  );
  const transactions =
    contextType === "purchase_order"
      ? (props.orders ?? [])
          .filter((item) => item.supplier_id === props.vendor.id)
          .map((item) => ({ id: item.id, label: item.reference }))
      : contextType === "shipment"
        ? (props.shipments ?? [])
            .filter((item) => item.supplier_id === props.vendor.id)
            .map((item) => ({ id: item.id, label: item.reference }))
        : contextType === "invoice"
          ? (props.invoices ?? [])
              .filter((item) => item.supplier_id === props.vendor.id)
              .map((item) => ({ id: item.id, label: item.invoice_number }))
          : [];

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="space-y-4">
        <Panel title="Conversations">
          <div className="space-y-2">
            {threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => setSelectedId(thread.id)}
                className={`w-full rounded-xl border p-3 text-left transition ${selected?.id === thread.id ? "border-blue-300 bg-blue-50" : "border-line hover:bg-mist"}`}
              >
                <strong className="block truncate text-sm">
                  {thread.subject}
                </strong>
                <span className="mt-1 block text-xs text-muted">
                  {humanize(thread.context_type)} ·{" "}
                  {formatActivityDate(thread.last_message_at)}
                </span>
              </button>
            ))}
            {!threads.length && (
              <p className="text-sm text-muted">No conversations yet.</p>
            )}
          </div>
        </Panel>
        <Panel title="Start conversation">
          <form action={createVendorConversation} className="space-y-3">
            <Hidden org={props.organizationId} vendor={props.vendor.id} />
            <Field name="subject" label="Subject" required />
            <label>
              <span className="mb-2 block text-sm font-bold">Related to</span>
              <select
                name="contextType"
                value={contextType}
                onChange={(event) =>
                  setContextType(event.target.value as typeof contextType)
                }
                className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm"
              >
                <option value="general">General</option>
                <option value="purchase_order">Purchase order</option>
                <option value="shipment">Shipment</option>
                <option value="invoice">Invoice</option>
              </select>
            </label>
            {contextType !== "general" && (
              <label>
                <span className="mb-2 block text-sm font-bold">
                  Transaction
                </span>
                <select
                  name="contextId"
                  required
                  className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm"
                >
                  <option value="">Select transaction</option>
                  {transactions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {contextType === "general" && (
              <input type="hidden" name="contextId" value="" />
            )}
            <TextArea
              name="message"
              label="Message"
              required
              maxLength={4000}
            />
            <AdminActionButton className="w-full">
              <Send size={14} /> Start conversation
            </AdminActionButton>
          </form>
        </Panel>
      </div>
      <Panel title={selected?.subject ?? "Messages"}>
        {selected ? (
          <>
            <div className="max-h-[520px] space-y-3 overflow-y-auto rounded-xl bg-mist p-4">
              {threadMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_party === "internal" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.sender_party === "internal" ? "bg-blue-600 text-white" : "border border-line bg-white"}`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-6">
                      {message.body}
                    </p>
                    <p
                      className={`mt-2 text-[10px] ${message.sender_party === "internal" ? "text-blue-100" : "text-muted"}`}
                    >
                      {message.sender_party === "internal"
                        ? "Your team"
                        : props.vendor.name}{" "}
                      · {formatActivityDate(message.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <form action={sendVendorMessage} className="mt-4 space-y-3">
              <Hidden org={props.organizationId} vendor={props.vendor.id} />
              <input type="hidden" name="conversationId" value={selected.id} />
              <TextArea
                name="message"
                label="Reply"
                required
                maxLength={4000}
              />
              <AdminActionButton>
                <Send size={14} /> Send message
              </AdminActionButton>
            </form>
          </>
        ) : (
          <Empty
            title="No conversation selected"
            body="Start a conversation about a purchase order, shipment, invoice, or general concern."
            compact
          />
        )}
      </Panel>
    </div>
  );
}

function ShipmentTimeline({ events }: { events: Row<"shipment_events">[] }) {
  if (!events.length) return null;
  return (
    <div className="mt-4 rounded-xl bg-mist p-4">
      <h4 className="text-xs font-bold uppercase tracking-wide text-muted">
        Tracking timeline
      </h4>
      <div className="mt-3 space-y-3">
        {events.map((event) => (
          <div key={event.id} className="flex gap-3 text-sm">
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-600 ring-4 ring-blue-100" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <strong>{humanize(event.status)}</strong>
                <span className="text-xs text-muted">
                  {formatActivityDate(event.occurred_at)}
                </span>
              </div>
              {(event.location || event.message) && (
                <p className="mt-1 text-xs leading-5 text-muted">
                  {[event.location, event.message].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Performance(props: Props & { vendor: Vendor; canManage: boolean }) {
  const scores = (props.performance ?? []).filter(
    (row) => row.supplier_id === props.vendor.id,
  );
  const score = scores[0];
  const reviews = (props.reviews ?? []).filter(
    (row) => row.supplier_id === props.vendor.id,
  );
  const improvements = (props.improvements ?? []).filter(
    (row) => row.supplier_id === props.vendor.id,
  );
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <Panel title="Latest 90-day scorecard">
        {score ? (
          <>
            <div className="flex items-center gap-5">
              <div className="grid size-28 place-items-center rounded-full border-[10px] border-blue-100 text-3xl font-bold text-blue-700">
                {score.overall_score.toFixed(0)}
              </div>
              <div>
                <h3 className="font-bold">Overall vendor score</h3>
                <p className="mt-1 text-sm text-muted">
                  {score.period_start} to {score.period_end}
                </p>
                <p className="mt-2 text-xs text-muted">
                  Based on {score.order_count} purchase orders ·{" "}
                  {score.response_time_hours.toFixed(1)}h response
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Score
                label="On-time delivery"
                value={score.on_time_delivery_rate}
              />
              <Score label="Fulfillment" value={score.fulfillment_rate} />
              <Score label="Quality" value={score.quality_score} />
              <Score label="Accuracy" value={score.accuracy_score} />
            </div>
            <PerformanceTrend scores={scores} />
          </>
        ) : (
          <Empty
            title="No scorecard"
            body="Calculate the first performance snapshot after transactions are recorded."
            compact
          />
        )}
        {props.canManage && (
          <form action={calculateVendorPerformance} className="mt-5">
            <Hidden org={props.organizationId} vendor={props.vendor.id} />
            <AdminActionButton variant="secondary">
              <RefreshCw size={14} /> Recalculate score
            </AdminActionButton>
          </form>
        )}
      </Panel>
      <div className="space-y-5">
        <Panel title="Lifecycle review">
          {reviews.slice(0, 3).map((review) => (
            <div
              key={review.id}
              className="border-b border-line py-3 text-sm last:border-0"
            >
              <div className="flex justify-between gap-3">
                <strong>{humanize(review.action)}</strong>
                <span className="text-xs text-muted">{review.review_date}</span>
              </div>
              <p className="mt-1 text-muted">{review.summary}</p>
            </div>
          ))}
          {props.canManage && (
            <form action={addVendorReview} className="mt-4 space-y-3">
              <Hidden org={props.organizationId} vendor={props.vendor.id} />
              <Select
                name="action"
                label="Action"
                values={[
                  "preferred",
                  "renew",
                  "coaching",
                  "warning",
                  "improvement_plan",
                  "suspend",
                  "deactivate",
                ]}
              />
              <TextArea name="summary" label="Review summary" required />
              <Field name="nextReviewDate" label="Next review" type="date" />
              <AdminActionButton className="w-full">
                Record review
              </AdminActionButton>
            </form>
          )}
        </Panel>
        <Panel title="Improvement plans">
          {improvements.slice(0, 3).map((plan) => (
            <div key={plan.id} className="mb-3 rounded-xl bg-mist p-3">
              <div className="flex justify-between gap-2">
                <strong className="text-sm">{plan.title}</strong>
                <Status value={plan.status} />
              </div>
              <p className="mt-2 text-xs text-muted">Due {plan.due_date}</p>
              <p className="mt-2 text-sm">{plan.objectives}</p>
            </div>
          ))}
          {props.canManage && (
            <form action={addVendorImprovementPlan} className="mt-4 space-y-3">
              <Hidden org={props.organizationId} vendor={props.vendor.id} />
              <Field name="title" label="Plan title" required />
              <TextArea
                name="objectives"
                label="Objectives and required actions"
                required
              />
              <Field name="dueDate" label="Due date" type="date" required />
              <AdminActionButton className="w-full">
                Create improvement plan
              </AdminActionButton>
            </form>
          )}
        </Panel>
      </div>
    </div>
  );
}

function VendorHistory(props: Props & { vendor: Vendor }) {
  const [filter, setFilter] = useState("all");
  const activity = (props.activity ?? []).filter(
    (event) =>
      event.supplier_id === props.vendor.id &&
      (filter === "all" || historyGroup(event.kind) === filter),
  );
  const orders = (props.orders ?? []).filter(
    (order) => order.supplier_id === props.vendor.id,
  );
  const invoices = (props.invoices ?? []).filter(
    (invoice) => invoice.supplier_id === props.vendor.id,
  );
  const payments = (props.payments ?? []).filter(
    (payment) => payment.supplier_id === props.vendor.id,
  );
  const totalOrdered = orders.reduce(
    (sum, order) => sum + Number(order.amount ?? 0),
    0,
  );
  const totalInvoiced = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.total_amount),
    0,
  );
  const totalPaid = payments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

  return (
    <div className="space-y-5">
      <div className="grid overflow-hidden rounded-2xl border border-line bg-white sm:grid-cols-3">
        <HistoryMetric
          label="Purchase orders"
          value={formatPhpCurrency(totalOrdered)}
          count={orders.length}
        />
        <HistoryMetric
          label="Invoices"
          value={formatPhpCurrency(totalInvoiced)}
          count={invoices.length}
        />
        <HistoryMetric
          label="Paid"
          value={formatPhpCurrency(totalPaid)}
          count={payments.filter((payment) => payment.status === "paid").length}
        />
      </div>
      <Panel
        title="Supplier activity history"
        action={
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="h-9 rounded-lg border border-line bg-white px-3 text-xs font-semibold"
          >
            <option value="all">All activity</option>
            <option value="orders">Orders</option>
            <option value="logistics">Logistics</option>
            <option value="billing">Billing</option>
            <option value="profile">Profile & reviews</option>
          </select>
        }
      >
        <ActivityTimeline activity={activity} />
      </Panel>
    </div>
  );
}

function PerformanceTrend({
  scores,
}: {
  scores: Row<"vendor_performance_snapshots">[];
}) {
  const points = [...scores].reverse().slice(-10);
  if (!points.length) return null;
  return (
    <div className="mt-7 border-t border-line pt-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold">Performance trend</h4>
          <p className="mt-1 text-xs text-muted">
            Automatic rolling 90-day snapshots
          </p>
        </div>
        <span className="text-xs font-semibold text-emerald-700">
          Auto-updated
        </span>
      </div>
      <div
        className="mt-5 flex h-36 items-end gap-2"
        role="img"
        aria-label="Vendor performance score trend"
      >
        {points.map((point) => (
          <div
            key={point.id}
            className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
          >
            <span className="text-[10px] font-bold text-blue-700 opacity-0 transition group-hover:opacity-100">
              {point.overall_score.toFixed(0)}%
            </span>
            <span
              className="w-full rounded-t-md bg-gradient-to-t from-blue-700 to-blue-400 transition group-hover:from-blue-800"
              style={{
                height: `${Math.max(5, Math.min(100, point.overall_score))}%`,
              }}
            />
            <span className="max-w-full truncate text-[9px] text-muted">
              {point.period_end.slice(5)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityTimeline({ activity }: { activity: Activity[] }) {
  if (!activity.length)
    return (
      <Empty
        title="No history yet"
        body="Supplier transactions and profile events will appear here."
        compact
      />
    );
  return (
    <div className="relative space-y-1 before:absolute before:bottom-4 before:left-[17px] before:top-4 before:w-px before:bg-blue-100">
      {activity.map((event) => (
        <article
          key={event.event_id}
          className="relative flex gap-4 rounded-xl p-3 transition hover:bg-mist"
        >
          <span className="relative z-10 mt-1 size-2.5 shrink-0 rounded-full bg-blue-600 ring-[5px] ring-blue-50" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold">{event.title}</h4>
                <p className="mt-1 text-xs text-muted">
                  {humanize(event.kind)} · {event.reference}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {event.amount !== null && (
                  <strong className="text-sm">
                    {formatPhpCurrency(event.amount)}
                  </strong>
                )}
                <Status value={event.status} />
              </div>
            </div>
            {event.detail && (
              <p className="mt-2 text-sm leading-6 text-muted">
                {event.detail}
              </p>
            )}
            <time className="mt-2 block text-xs text-muted">
              {formatActivityDate(event.occurred_at)}
            </time>
          </div>
        </article>
      ))}
    </div>
  );
}

function HistoryMetric({
  label,
  value,
  count,
}: {
  label: string;
  value: string;
  count: number;
}) {
  return (
    <div className="border-b border-r border-line p-5 last:border-r-0 sm:border-b-0">
      <p className="text-sm text-muted">{label}</p>
      <strong className="mt-2 block text-2xl">{value}</strong>
      <p className="mt-1 text-xs text-muted">
        {count} record{count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function historyGroup(kind: string) {
  if (["purchase_order", "acknowledgement"].includes(kind)) return "orders";
  if (["shipment", "goods_receipt"].includes(kind)) return "logistics";
  if (["invoice", "payment"].includes(kind)) return "billing";
  return "profile";
}

function formatActivityDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function Drawer({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <motion.button
        aria-label="Close form"
        onClick={onClose}
        className="fixed inset-0 z-[70] bg-ink/40 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.aside
        className="fixed inset-y-0 right-0 z-[80] flex h-dvh w-full flex-col overflow-y-auto bg-[#f8faff] shadow-[-24px_0_70px_rgba(7,23,45,.18)] sm:max-w-[680px]"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
      >
        <div className="sticky top-0 z-10 flex items-center border-b border-line bg-white px-5 py-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto grid size-10 place-items-center rounded-xl border border-line"
          >
            <X size={17} />
          </button>
        </div>
        {children}
      </motion.aside>
    </>
  );
}
function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-bold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="border-b border-r border-line p-5">
      <p className="text-sm text-muted">{label}</p>
      <strong className="mt-2 block text-3xl">{value}</strong>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </div>
  );
}
function Mini({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-mist p-3">
      <p className="text-xs text-muted">{label}</p>
      <strong className="mt-1 block break-words text-sm">{value}</strong>
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 border-b border-line py-3 text-sm last:border-0">
      <span className="w-24 shrink-0 text-muted">{label}</span>
      <strong className="break-words">{value}</strong>
    </div>
  );
}
function Status({ value }: { value: string }) {
  const good = [
    "approved",
    "active",
    "verified",
    "paid",
    "confirmed",
    "delivered",
    "matched",
  ].includes(value);
  const bad = [
    "rejected",
    "suspended",
    "archived",
    "exception",
    "overdue",
    "failed",
  ].includes(value);
  return (
    <span
      className={`rounded-full px-2.5 py-1 font-mono text-xs ${good ? "bg-emerald-50 text-emerald-700" : bad ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}
    >
      {humanize(value)}
    </span>
  );
}
function Score({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <strong>{value.toFixed(0)}%</strong>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-50">
        <span
          className="block h-full rounded-full bg-blue-600"
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}
function Empty({
  title,
  body,
  compact,
}: {
  title: string;
  body: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`grid place-items-center text-center ${compact ? "py-8" : "min-h-64 p-8"}`}
    >
      <div>
        <Users className="mx-auto text-blue-300" size={28} />
        <h2 className="mt-4 font-bold">{title}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
          {body}
        </p>
      </div>
    </div>
  );
}
function Hidden({ org, vendor }: { org?: string; vendor: string }) {
  return (
    <>
      <input type="hidden" name="organizationId" value={org} />
      <input type="hidden" name="supplierId" value={vendor} />
    </>
  );
}
function Field({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-bold">{label}</span>
      <input
        {...props}
        className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}
function TextArea({
  label,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold">{label}</span>
      <textarea
        {...props}
        className="min-h-24 w-full rounded-xl border border-line bg-white p-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}
function Select({
  name,
  label,
  values,
  defaultValue,
}: {
  name: string;
  label: string;
  values: string[];
  defaultValue?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? values[0]}
        className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm"
      >
        {values.map((value) => (
          <option key={value} value={value}>
            {humanize(value)}
          </option>
        ))}
      </select>
    </label>
  );
}
function SelectOptions({
  name,
  label,
  options,
  optional,
}: {
  name: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  optional?: boolean;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold">{label}</span>
      <select
        name={name}
        className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm"
      >
        {optional && <option value="">Not mapped</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
function Check({
  name,
  label,
  defaultChecked = true,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-line p-3 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-4 accent-blue-600"
      />
      {label}
    </label>
  );
}
function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
