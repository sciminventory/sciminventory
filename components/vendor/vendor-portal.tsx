"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  Banknote,
  Bell,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  FileUp,
  Gauge,
  MessageSquare,
  Pencil,
  Send,
  ShoppingCart,
  Trash2,
  Truck,
} from "lucide-react";
import { AdminActionButton } from "@/components/operations/admin-action-button";
import {
  acknowledgePurchaseOrder,
  addPortalCatalogItem,
  addVendorAddress,
  addVendorContact,
  addVendorShippingRule,
  archiveVendorContact,
  createVendorShipment,
  createPortalConversation,
  markVendorNotificationRead,
  submitVendorInvoice,
  sendPortalMessage,
  updateVendorContact,
  updateVendorProfile,
  updateVendorShipment,
  uploadVendorDocument,
} from "@/app/(vendor)/vendor/actions";
import { formatPhpCurrency } from "@/lib/utils";
import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];
type Row<K extends keyof Tables> = Tables[K]["Row"];
type Activity = Database["public"]["Views"]["vendor_activity_history"]["Row"];
type Section =
  | "overview"
  | "profile"
  | "catalog"
  | "orders"
  | "shipments"
  | "invoices"
  | "performance"
  | "history"
  | "messages";

type Props = {
  section: Section;
  success?: string;
  error?: string;
  setupError?: string;
  access: Pick<
    Row<"vendor_users">,
    "organization_id" | "supplier_id" | "role" | "status"
  >;
  vendor: Row<"suppliers">;
  documents: Row<"vendor_documents">[];
  catalog: Row<"vendor_catalog_items">[];
  contacts: Row<"vendor_contacts">[];
  addresses: Row<"vendor_addresses">[];
  shippingRules: Row<"vendor_shipping_rules">[];
  orders: Row<"procurement_records">[];
  orderLines: Row<"procurement_record_lines">[];
  acknowledgements: Row<"purchase_order_acknowledgements">[];
  shipments: Row<"shipments">[];
  shipmentLines: Row<"shipment_lines">[];
  shipmentEvents: Row<"shipment_events">[];
  invoices: Row<"vendor_invoices">[];
  invoiceLines: Row<"vendor_invoice_lines">[];
  payments: Row<"payment_records">[];
  performance: Row<"vendor_performance_snapshots">[];
  reviews: Row<"vendor_reviews">[];
  improvements: Row<"vendor_improvement_plans">[];
  notifications: Row<"notifications">[];
  activity: Activity[];
  conversations: Row<"vendor_conversations">[];
  messages: Row<"vendor_messages">[];
  fileUrls: Record<string, string>;
};

const titles: Record<Section, [string, string]> = {
  overview: [
    "Vendor overview",
    "Your orders, deliveries, documents, invoices, and alerts in one place.",
  ],
  profile: [
    "Company profile",
    "Maintain verified business details and compliance documents.",
  ],
  catalog: [
    "Product catalog",
    "Publish standardized items, pricing, lead times, and packaging.",
  ],
  orders: [
    "Purchase orders",
    "Review order lines and send a controlled acknowledgement.",
  ],
  shipments: [
    "Shipment management",
    "Prepare dispatches and keep the buyer informed in real time.",
  ],
  invoices: [
    "Invoices and payments",
    "Submit invoices and follow matching and payment progress.",
  ],
  performance: [
    "Performance scorecard",
    "Review service KPIs, feedback, and improvement actions.",
  ],
  history: [
    "Transaction history",
    "Follow every purchase order, delivery, invoice, payment, and review in one audit-ready timeline.",
  ],
  messages: [
    "Messages",
    "Discuss purchase orders, shipments, invoices, and other transaction concerns with the procurement team.",
  ],
};

export function VendorPortal(props: Props) {
  const [title, description] = titles[props.section];
  return (
    <main className="min-w-0 p-4 sm:p-6 lg:p-10">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="font-mono text-xs uppercase tracking-[.12em] text-blue-700">
          {props.vendor.code} · {humanize(props.access.role)}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-.05em] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          {description}
        </p>
      </motion.header>
      {(props.success || props.error || props.setupError) && (
        <div
          className={`mt-6 rounded-xl border px-4 py-3 text-sm ${props.error || props.setupError ? "border-red-200 bg-red-50 text-red-800" : "border-blue-200 bg-blue-50 text-blue-800"}`}
        >
          {props.error ?? props.setupError ?? props.success}
        </div>
      )}
      <motion.div
        key={props.section}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mt-6"
      >
        {props.section === "overview" && <Overview {...props} />}
        {props.section === "profile" && <Profile {...props} />}
        {props.section === "catalog" && <Catalog {...props} />}
        {props.section === "orders" && <Orders {...props} />}
        {props.section === "shipments" && <Shipments {...props} />}
        {props.section === "invoices" && <Invoices {...props} />}
        {props.section === "performance" && <Performance {...props} />}
        {props.section === "history" && <VendorHistory {...props} />}
        {props.section === "messages" && <Messages {...props} />}
      </motion.div>
    </main>
  );
}

function Overview(props: Props) {
  const openOrders = props.orders.filter(
    (order) =>
      !["completed", "closed", "cancelled", "rejected"].includes(order.status),
  );
  const activeShipments = props.shipments.filter(
    (shipment) => !["delivered", "cancelled"].includes(shipment.status),
  );
  const unpaid = props.invoices.filter(
    (invoice) => !["paid", "cancelled", "rejected"].includes(invoice.status),
  );
  return (
    <>
      <div className="grid overflow-hidden rounded-2xl border border-line bg-white shadow-sm sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={ShoppingCart}
          label="Open orders"
          value={openOrders.length}
        />
        <Metric
          icon={Truck}
          label="Active shipments"
          value={activeShipments.length}
        />
        <Metric icon={Banknote} label="Unpaid invoices" value={unpaid.length} />
        <Metric
          icon={Gauge}
          label="Latest score"
          value={
            props.performance[0]
              ? `${props.performance[0].overall_score.toFixed(0)}%`
              : "—"
          }
        />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_380px]">
        <Panel title="Action queue">
          {openOrders
            .filter((order) => order.status === "sent")
            .map((order) => (
              <LinkCard
                key={order.id}
                href="/vendor/orders"
                title={`Acknowledge ${order.reference}`}
                detail={formatPhpCurrency(Number(order.amount ?? 0))}
                icon={ClipboardCheck}
              />
            ))}
          {activeShipments.map((shipment) => (
            <LinkCard
              key={shipment.id}
              href="/vendor/shipments"
              title={`Update ${shipment.reference}`}
              detail={humanize(shipment.status)}
              icon={Truck}
            />
          ))}
          {unpaid.map((invoice) => (
            <LinkCard
              key={invoice.id}
              href="/vendor/invoices"
              title={`Invoice ${invoice.invoice_number}`}
              detail={`${humanize(invoice.status)} · ${formatPhpCurrency(invoice.total_amount)}`}
              icon={Banknote}
            />
          ))}
          {!openOrders.length && !activeShipments.length && !unpaid.length && (
            <Empty text="No outstanding vendor actions." />
          )}
        </Panel>
        <Panel title="Notifications">
          {props.notifications.slice(0, 8).map((notice) => (
            <form
              key={notice.id}
              action={markVendorNotificationRead}
              className="border-b border-line py-3 last:border-0"
            >
              <input type="hidden" name="notificationId" value={notice.id} />
              <button className="flex w-full gap-3 text-left">
                <span
                  className={`mt-1 size-2 shrink-0 rounded-full ${notice.read_at ? "bg-slate-200" : "bg-blue-600"}`}
                />
                <span>
                  <strong className="text-sm">{notice.title}</strong>
                  <span className="mt-1 block text-xs leading-5 text-muted">
                    {notice.message}
                  </span>
                </span>
              </button>
            </form>
          ))}
          {!props.notifications.length && (
            <Empty text="No notifications yet." />
          )}
        </Panel>
      </div>
    </>
  );
}

function Profile(props: Props) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        <Panel title="Business information">
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <Info
              label="Legal name"
              value={props.vendor.legal_name ?? props.vendor.name}
            />
            <Info
              label="Category"
              value={humanize(props.vendor.vendor_category)}
            />
            <Info
              label="Onboarding"
              value={humanize(props.vendor.onboarding_status)}
            />
            <Info
              label="Tax ID"
              value={props.vendor.tax_id ?? "Not provided"}
            />
            <Info
              label="Payment terms"
              value={`Net ${props.vendor.payment_terms_days}`}
            />
            <Info
              label="Risk rating"
              value={humanize(props.vendor.risk_rating)}
            />
          </div>
          {props.access.role === "admin" && (
            <form
              action={updateVendorProfile}
              className="grid gap-4 sm:grid-cols-2"
            >
              <Field
                label="Contact email"
                name="contactEmail"
                type="email"
                defaultValue={props.vendor.contact_email ?? ""}
                required
              />
              <Field
                label="Phone"
                name="phone"
                defaultValue={props.vendor.phone ?? ""}
              />
              <Field
                label="Website"
                name="website"
                defaultValue={props.vendor.website ?? ""}
              />
              <Field
                label="Delivery capacity"
                name="deliveryCapacity"
                type="number"
                min="0"
                defaultValue={props.vendor.delivery_capacity ?? 0}
              />
              <Field
                label="Address"
                name="address"
                defaultValue={props.vendor.address_line ?? ""}
                className="sm:col-span-2"
              />
              <Field
                label="City"
                name="city"
                defaultValue={props.vendor.city ?? ""}
              />
              <Field
                label="Province"
                name="province"
                defaultValue={props.vendor.province ?? ""}
              />
              <Field
                label="Postal code"
                name="postalCode"
                defaultValue={props.vendor.postal_code ?? ""}
              />
              <Field
                label="Delivery methods · comma separated"
                name="deliveryMethods"
                defaultValue={props.vendor.delivery_methods.join(", ")}
                className="sm:col-span-2"
              />
              <Field
                label="Service areas · comma separated"
                name="serviceAreas"
                defaultValue={props.vendor.service_areas.join(", ")}
                className="sm:col-span-2"
              />
              <div className="sm:col-span-2">
                <AdminActionButton>Save profile changes</AdminActionButton>
              </div>
            </form>
          )}
        </Panel>
        <MasterData props={props} />
      </div>
      <div className="space-y-5">
        <Panel title="Compliance documents">
          {props.documents.map((doc) => (
            <div key={doc.id} className="mb-3 rounded-xl bg-mist p-3">
              <div className="flex justify-between gap-3">
                <strong className="text-sm">{doc.title}</strong>
                <Status value={doc.status} />
              </div>
              <p className="mt-1 text-xs text-muted">
                {humanize(doc.document_type)}
                {doc.expires_at ? ` · expires ${doc.expires_at}` : ""}
              </p>
              {props.fileUrls[doc.storage_path] && (
                <a
                  href={props.fileUrls[doc.storage_path]}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs font-bold text-blue-700 hover:underline"
                >
                  Open document
                </a>
              )}
            </div>
          ))}
          {["admin", "member"].includes(props.access.role) && (
            <form action={uploadVendorDocument} className="mt-4 space-y-3">
              <Field label="Document title" name="title" required />
              <Select
                label="Document type"
                name="documentType"
                values={[
                  "tax_document",
                  "business_registration",
                  "certification",
                  "insurance",
                  "bank_document",
                  "other",
                ]}
              />
              <Field label="Expiration date" name="expiresAt" type="date" />
              <label>
                <span className="mb-2 block text-sm font-bold">
                  File · PDF, DOCX, JPG or PNG
                </span>
                <input
                  required
                  type="file"
                  name="file"
                  accept=".pdf,.docx,.jpg,.jpeg,.png"
                  className="block w-full rounded-xl border border-line bg-white text-sm file:mr-3 file:border-0 file:bg-blue-50 file:p-3"
                />
              </label>
              <AdminActionButton className="w-full">
                <FileUp size={14} /> Upload for verification
              </AdminActionButton>
            </form>
          )}
        </Panel>
      </div>
    </div>
  );
}

function MasterData({ props }: { props: Props }) {
  const canAdmin = props.access.role === "admin";
  const activeContacts = props.contacts.filter((contact) => contact.is_active);
  const archivedContacts = props.contacts.filter(
    (contact) => !contact.is_active,
  );
  return (
    <Panel title="Contacts, addresses, and delivery rules">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xs font-bold uppercase text-muted">Contacts</h3>
          <span className="text-xs text-muted">
            {activeContacts.length} active
          </span>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {activeContacts.map((contact) => (
            <div key={contact.id} className="rounded-xl border border-line p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <strong className="block truncate text-sm">
                    {contact.full_name}
                  </strong>
                  <p className="mt-1 break-all text-sm text-muted">
                    {contact.email}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {contact.job_title || "Contact"}
                    {contact.phone ? ` · ${contact.phone}` : ""}
                  </p>
                </div>
                {contact.is_primary && <Status value="primary" />}
              </div>
              {canAdmin && (
                <details className="mt-3 rounded-lg bg-mist p-3">
                  <summary className="flex cursor-pointer items-center gap-2 text-sm font-bold">
                    <Pencil size={14} /> Edit contact
                  </summary>
                  <form action={updateVendorContact} className="mt-4 space-y-3">
                    <input type="hidden" name="contactId" value={contact.id} />
                    <input type="hidden" name="isActive" value="on" />
                    <Field
                      label="Full name"
                      name="fullName"
                      defaultValue={contact.full_name}
                      required
                    />
                    <Field
                      label="Job title"
                      name="jobTitle"
                      defaultValue={contact.job_title ?? ""}
                    />
                    <Field
                      label="Email"
                      name="email"
                      type="email"
                      defaultValue={contact.email}
                      required
                    />
                    <Field
                      label="Phone"
                      name="phone"
                      defaultValue={contact.phone ?? ""}
                    />
                    <Check
                      name="isPrimary"
                      label="Primary contact"
                      defaultChecked={contact.is_primary}
                    />
                    <div className="flex flex-wrap gap-2">
                      <AdminActionButton>Save contact</AdminActionButton>
                    </div>
                  </form>
                  <form action={archiveVendorContact} className="mt-2">
                    <input type="hidden" name="contactId" value={contact.id} />
                    <AdminActionButton className="bg-red-600 hover:bg-red-700">
                      <Trash2 size={14} /> Archive
                    </AdminActionButton>
                  </form>
                </details>
              )}
            </div>
          ))}
          {!activeContacts.length && <Empty text="No active contacts." />}
        </div>
        {canAdmin && archivedContacts.length > 0 && (
          <details className="mt-3 rounded-xl border border-dashed border-line p-4">
            <summary className="cursor-pointer text-sm font-bold text-muted">
              Archived contacts ({archivedContacts.length})
            </summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {archivedContacts.map((contact) => (
                <form
                  key={contact.id}
                  action={updateVendorContact}
                  className="rounded-xl bg-mist p-3"
                >
                  <input type="hidden" name="contactId" value={contact.id} />
                  <input
                    type="hidden"
                    name="fullName"
                    value={contact.full_name}
                  />
                  <input
                    type="hidden"
                    name="jobTitle"
                    value={contact.job_title ?? ""}
                  />
                  <input type="hidden" name="email" value={contact.email} />
                  <input
                    type="hidden"
                    name="phone"
                    value={contact.phone ?? ""}
                  />
                  <input type="hidden" name="isActive" value="on" />
                  <strong className="block text-sm">{contact.full_name}</strong>
                  <span className="block text-xs text-muted">
                    {contact.email}
                  </span>
                  <AdminActionButton className="mt-3">
                    Restore contact
                  </AdminActionButton>
                </form>
              ))}
            </div>
          </details>
        )}
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div>
          <h3 className="text-xs font-bold uppercase text-muted">Addresses</h3>
          {props.addresses.map((address) => (
            <p key={address.id} className="mt-2 text-sm">
              <strong>{address.label}</strong>
              <br />
              <span className="text-muted">
                {address.address_line}, {address.city}
              </span>
            </p>
          ))}
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase text-muted">
            Shipping rules
          </h3>
          {props.shippingRules.map((rule) => (
            <p key={rule.id} className="mt-2 text-sm">
              <strong>{rule.shipping_method}</strong>
              <br />
              <span className="text-muted">
                {rule.service_area}
                {rule.cutoff_time
                  ? ` · ${rule.cutoff_time.slice(0, 5)} cutoff`
                  : ""}
              </span>
            </p>
          ))}
        </div>
      </div>
      {canAdmin && (
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <details className="rounded-xl bg-mist p-3">
            <summary className="cursor-pointer text-sm font-bold">
              Add contact
            </summary>
            <form action={addVendorContact} className="mt-4 space-y-3">
              <Field label="Full name" name="fullName" required />
              <Field label="Job title" name="jobTitle" />
              <Field label="Email" name="email" type="email" required />
              <Field label="Phone" name="phone" />
              <Check name="isPrimary" label="Primary contact" />
              <AdminActionButton className="w-full">
                Add contact
              </AdminActionButton>
            </form>
          </details>
          <details className="rounded-xl bg-mist p-3">
            <summary className="cursor-pointer text-sm font-bold">
              Add address
            </summary>
            <form action={addVendorAddress} className="mt-4 space-y-3">
              <Select
                label="Address type"
                name="addressType"
                values={["office", "warehouse", "billing", "returns"]}
              />
              <Field label="Label" name="label" required />
              <Field label="Address" name="addressLine" required />
              <Field label="City" name="city" required />
              <Field label="Province" name="province" />
              <Field label="Postal code" name="postalCode" />
              <Field
                label="Country code"
                name="countryCode"
                defaultValue="PH"
                required
              />
              <Check name="isPrimary" label="Primary address" />
              <AdminActionButton className="w-full">
                Add address
              </AdminActionButton>
            </form>
          </details>
          <details className="rounded-xl bg-mist p-3">
            <summary className="cursor-pointer text-sm font-bold">
              Add shipping rule
            </summary>
            <form action={addVendorShippingRule} className="mt-4 space-y-3">
              <Field label="Shipping method" name="shippingMethod" required />
              <Field label="Service area" name="serviceArea" required />
              <Field label="Order cutoff" name="cutoffTime" type="time" />
              <Field
                label="Delay penalty (%)"
                name="delayPenaltyRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                defaultValue="0"
              />
              <Field label="Instructions" name="instructions" />
              <AdminActionButton className="w-full">Add rule</AdminActionButton>
            </form>
          </details>
        </div>
      )}
    </Panel>
  );
}

function Catalog(props: Props) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <Panel title="Published catalog">
        {props.catalog.map((item) => (
          <article
            key={item.id}
            className="border-b border-line py-4 first:pt-0 last:border-0"
          >
            <div className="flex justify-between gap-3">
              <div>
                <h3 className="font-bold">{item.description}</h3>
                <p className="mt-1 font-mono text-xs text-blue-700">
                  {item.vendor_item_code}
                </p>
              </div>
              <strong>{formatPhpCurrency(item.unit_price)}</strong>
            </div>
            <p className="mt-2 text-xs text-muted">
              MOQ {item.minimum_order_quantity} · {item.lead_time_days} day lead
              time · {humanize(item.status)}
            </p>
          </article>
        ))}
        {!props.catalog.length && (
          <Empty text="No catalog items have been submitted." />
        )}
      </Panel>
      <Panel title="Submit catalog item">
        <form action={addPortalCatalogItem} className="space-y-3">
          <input type="hidden" name="productId" value="" />
          <Field label="Vendor item code" name="itemCode" required />
          <Field label="Description" name="description" required />
          <Field
            label="Unit price (₱)"
            name="unitPrice"
            type="number"
            step="0.01"
            min="0"
            required
          />
          <Field
            label="Minimum order quantity"
            name="moq"
            type="number"
            step="0.0001"
            min="0.0001"
            defaultValue="1"
            required
          />
          <Field
            label="Lead time (days)"
            name="leadTimeDays"
            type="number"
            min="0"
            defaultValue="0"
          />
          <Field
            label="Delivery window (days)"
            name="deliveryWindowDays"
            type="number"
            min="0"
            defaultValue="0"
          />
          <Field label="Packaging specifications" name="packagingSpecs" />
          <AdminActionButton className="w-full">
            <Boxes size={14} /> Submit catalog item
          </AdminActionButton>
        </form>
      </Panel>
    </div>
  );
}

function Orders(props: Props) {
  return (
    <div className="space-y-4">
      {props.orders.map((order) => {
        const lines = props.orderLines.filter(
          (line) => line.procurement_record_id === order.id,
        );
        const ack = props.acknowledgements.find(
          (row) => row.purchase_order_id === order.id,
        );
        return (
          <Panel
            key={order.id}
            title={`${order.reference} · ${order.title}`}
            action={<Status value={order.status} />}
          >
            <div className="grid gap-3 sm:grid-cols-4">
              <Info
                label="Value"
                value={formatPhpCurrency(Number(order.amount ?? 0))}
              />
              <Info
                label="Delivery"
                value={
                  order.delivery_date ?? order.due_at?.slice(0, 10) ?? "Not set"
                }
              />
              <Info label="Version" value={`v${order.version}`} />
              <Info
                label="Response"
                value={ack ? humanize(ack.response) : "Awaiting response"}
              />
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="text-xs uppercase text-muted">
                  <tr>
                    <th className="py-2">Description</th>
                    <th>Quantity</th>
                    <th>Unit price</th>
                    <th>Promised</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.id} className="border-t border-line">
                      <td className="py-3">{line.description}</td>
                      <td>{line.quantity}</td>
                      <td>{formatPhpCurrency(line.unit_price)}</td>
                      <td>{line.promised_date ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {["sent", "revised"].includes(order.status) && (
              <form
                action={acknowledgePurchaseOrder}
                className="mt-5 grid gap-3 rounded-xl bg-blue-50 p-4 sm:grid-cols-2"
              >
                <input type="hidden" name="purchaseOrderId" value={order.id} />
                <Select
                  label="Response"
                  name="response"
                  values={["confirmed", "revised", "rejected"]}
                />
                <Field
                  label="Proposed amount (₱)"
                  name="proposedAmount"
                  type="number"
                  min="0"
                  step="0.01"
                />
                <Field
                  label="Proposed delivery date"
                  name="proposedDeliveryDate"
                  type="date"
                />
                <Field
                  label="Response message"
                  name="message"
                  className="sm:col-span-2"
                />
                <div className="sm:col-span-2">
                  <AdminActionButton>
                    <Send size={14} /> Send acknowledgement
                  </AdminActionButton>
                </div>
              </form>
            )}
          </Panel>
        );
      })}
      {!props.orders.length && (
        <Empty text="No purchase orders have been assigned to your company." />
      )}
    </div>
  );
}

function Shipments(props: Props) {
  const shippableOrders = props.orders.filter(
    (order) =>
      ["confirmed", "processing", "packing", "ready_for_shipment"].includes(
        order.status,
      ) && order.warehouse_id,
  );
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_390px]">
      <div className="space-y-4">
        {props.shipments.map((shipment) => (
          <Panel
            key={shipment.id}
            title={`${shipment.reference} · ${shipment.title}`}
            action={<Status value={shipment.status} />}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <Info
                label="Carrier"
                value={shipment.carrier ?? "Not assigned"}
              />
              <Info
                label="Tracking"
                value={shipment.tracking_number ?? "Not provided"}
              />
              <Info
                label="Expected"
                value={
                  shipment.expected_arrival_at
                    ?.slice(0, 16)
                    .replace("T", " ") ?? "Not set"
                }
              />
            </div>
            <ShipmentTimeline
              events={props.shipmentEvents.filter(
                (event) => event.shipment_id === shipment.id,
              )}
            />
            {props.shipmentLines
              .filter((line) => line.shipment_id === shipment.id)
              .map((line) => (
                <p
                  key={line.id}
                  className="mt-4 rounded-xl bg-mist p-3 text-sm"
                >
                  {line.description} · {line.received_quantity}/{line.quantity}{" "}
                  received
                </p>
              ))}
            <details className="mt-4 rounded-xl border border-line p-3">
              <summary className="cursor-pointer text-sm font-bold">
                Post status update
              </summary>
              <form
                action={updateVendorShipment}
                className="mt-4 grid gap-3 sm:grid-cols-2"
              >
                <input type="hidden" name="shipmentId" value={shipment.id} />
                <Select
                  label="Status"
                  name="status"
                  values={[
                    "processing",
                    "packing",
                    "ready_for_shipment",
                    "dispatched",
                    "in_transit",
                    "arrived",
                    "exception",
                  ]}
                  defaultValue={shipment.status}
                />
                <Field label="Current location" name="location" />
                <Field
                  label="Latitude (optional)"
                  name="latitude"
                  type="number"
                  min="-90"
                  max="90"
                  step="any"
                />
                <Field
                  label="Longitude (optional)"
                  name="longitude"
                  type="number"
                  min="-180"
                  max="180"
                  step="any"
                />
                <Field
                  label="Update message"
                  name="message"
                  className="sm:col-span-2"
                />
                <AdminActionButton>Update shipment</AdminActionButton>
              </form>
            </details>
          </Panel>
        ))}
        {!props.shipments.length && (
          <Empty text="No shipments have been created." />
        )}
      </div>
      <Panel title="Create shipment">
        {shippableOrders.map((order) => (
          <div
            key={order.id}
            className="mb-4 border-b border-line pb-4 last:border-0"
          >
            <h3 className="text-sm font-bold">{order.reference}</h3>
            {props.orderLines
              .filter(
                (line) =>
                  line.procurement_record_id === order.id &&
                  line.received_quantity < line.quantity,
              )
              .map((line) => (
                <details key={line.id} className="mt-3 rounded-xl bg-mist p-3">
                  <summary className="cursor-pointer text-sm">
                    Ship {line.description}
                  </summary>
                  <form
                    action={createVendorShipment}
                    className="mt-4 space-y-3"
                  >
                    <input
                      type="hidden"
                      name="purchaseOrderId"
                      value={order.id}
                    />
                    <input
                      type="hidden"
                      name="purchaseOrderLineId"
                      value={line.id}
                    />
                    <input
                      type="hidden"
                      name="productId"
                      value={line.product_id ?? ""}
                    />
                    <input
                      type="hidden"
                      name="warehouseId"
                      value={order.warehouse_id ?? ""}
                    />
                    <input
                      type="hidden"
                      name="description"
                      value={line.description}
                    />
                    <Field
                      label="Shipment reference"
                      name="reference"
                      placeholder="SHP-0001"
                      required
                    />
                    <Field label="Shipment title" name="title" required />
                    <Field
                      label="Quantity"
                      name="quantity"
                      type="number"
                      min="0.0001"
                      max={line.quantity - line.received_quantity}
                      step="0.0001"
                      required
                    />
                    <Field label="Carrier" name="carrier" />
                    <Field label="Tracking number" name="trackingNumber" />
                    <Field label="Vehicle details" name="vehicleDetails" />
                    <Field
                      label="Expected arrival"
                      name="expectedArrivalAt"
                      type="datetime-local"
                    />
                    <AdminActionButton className="w-full">
                      <Truck size={14} /> Create shipment
                    </AdminActionButton>
                  </form>
                </details>
              ))}
          </div>
        ))}
        {!shippableOrders.length && (
          <Empty text="Confirmed orders will become available for shipment." />
        )}
      </Panel>
    </div>
  );
}

function Invoices(props: Props) {
  const invoiceable = props.orders.filter((order) =>
    [
      "confirmed",
      "processing",
      "packing",
      "ready_for_shipment",
      "in_transit",
      "partially_received",
      "received",
      "completed",
    ].includes(order.status),
  );
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_390px]">
      <div className="space-y-4">
        {props.invoices.map((invoice) => (
          <Panel
            key={invoice.id}
            title={`Invoice ${invoice.invoice_number}`}
            action={<Status value={invoice.status} />}
          >
            <div className="grid gap-3 sm:grid-cols-4">
              <Info
                label="Total"
                value={formatPhpCurrency(invoice.total_amount)}
              />
              <Info label="Invoice date" value={invoice.invoice_date} />
              <Info label="Due date" value={invoice.due_date} />
              <Info
                label="Payment"
                value={
                  props.payments.some(
                    (payment) =>
                      payment.invoice_id === invoice.id &&
                      payment.status === "paid",
                  )
                    ? "Paid"
                    : "Pending"
                }
              />
            </div>
            {invoice.mismatch_reason && (
              <p className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle size={16} />
                {invoice.mismatch_reason}
              </p>
            )}
            {props.payments
              .filter((payment) => payment.invoice_id === invoice.id)
              .map((payment) => (
                <p
                  key={payment.id}
                  className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
                >
                  {payment.reference} · {formatPhpCurrency(payment.amount)} ·{" "}
                  {humanize(payment.status)}
                </p>
              ))}
          </Panel>
        ))}
        {!props.invoices.length && (
          <Empty text="No invoices have been submitted." />
        )}
      </div>
      <Panel title="Submit invoice">
        {invoiceable.map((order) => (
          <div key={order.id} className="mb-4 border-b border-line pb-4">
            <h3 className="text-sm font-bold">{order.reference}</h3>
            {props.orderLines
              .filter((line) => line.procurement_record_id === order.id)
              .map((line) => (
                <details key={line.id} className="mt-3 rounded-xl bg-mist p-3">
                  <summary className="cursor-pointer text-sm">
                    Invoice {line.description}
                  </summary>
                  <form action={submitVendorInvoice} className="mt-4 space-y-3">
                    <input
                      type="hidden"
                      name="purchaseOrderId"
                      value={order.id}
                    />
                    <input
                      type="hidden"
                      name="purchaseOrderLineId"
                      value={line.id}
                    />
                    <input
                      type="hidden"
                      name="description"
                      value={line.description}
                    />
                    <Field
                      label="Invoice number"
                      name="invoiceNumber"
                      required
                    />
                    <Field
                      label="Invoice date"
                      name="invoiceDate"
                      type="date"
                      required
                    />
                    <Field
                      label="Due date"
                      name="dueDate"
                      type="date"
                      required
                    />
                    <Field
                      label="Quantity"
                      name="quantity"
                      type="number"
                      min="0.0001"
                      step="0.0001"
                      defaultValue={line.quantity}
                      required
                    />
                    <Field
                      label="Unit price (₱)"
                      name="unitPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={line.unit_price}
                      required
                    />
                    <Field
                      label="Tax rate (%)"
                      name="taxRate"
                      type="number"
                      min="0"
                      max="100"
                      defaultValue={line.tax_rate}
                    />
                    <label>
                      <span className="mb-2 block text-sm font-bold">
                        Invoice file · PDF or DOCX
                      </span>
                      <input
                        required
                        type="file"
                        name="file"
                        accept=".pdf,.docx"
                        className="block w-full rounded-xl border border-line bg-white text-sm file:mr-3 file:border-0 file:bg-blue-50 file:p-3"
                      />
                    </label>
                    <AdminActionButton className="w-full">
                      <Banknote size={14} /> Submit invoice
                    </AdminActionButton>
                  </form>
                </details>
              ))}
          </div>
        ))}
        {!invoiceable.length && (
          <Empty text="Confirmed orders are required before invoicing." />
        )}
      </Panel>
    </div>
  );
}

function Messages(props: Props) {
  const [selectedId, setSelectedId] = useState(
    props.conversations[0]?.id ?? "",
  );
  const [contextType, setContextType] = useState<
    "general" | "purchase_order" | "shipment" | "invoice"
  >("general");
  const selected =
    props.conversations.find((thread) => thread.id === selectedId) ??
    props.conversations[0];
  const threadMessages = props.messages.filter(
    (message) => message.conversation_id === selected?.id,
  );
  const transactions =
    contextType === "purchase_order"
      ? props.orders.map((item) => ({ id: item.id, label: item.reference }))
      : contextType === "shipment"
        ? props.shipments.map((item) => ({
            id: item.id,
            label: item.reference,
          }))
        : contextType === "invoice"
          ? props.invoices.map((item) => ({
              id: item.id,
              label: item.invoice_number,
            }))
          : [];

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="space-y-4">
        <Panel title="Conversations">
          <div className="space-y-2">
            {props.conversations.map((thread) => (
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
            {!props.conversations.length && (
              <p className="text-sm text-muted">No conversations yet.</p>
            )}
          </div>
        </Panel>
        <Panel title="Start conversation">
          <form action={createPortalConversation} className="space-y-3">
            <Field label="Subject" name="subject" required />
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
            {contextType === "general" ? (
              <input type="hidden" name="contextId" value="" />
            ) : (
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
            <TextArea
              label="Message"
              name="message"
              required
              maxLength={4000}
            />
            <AdminActionButton className="w-full">
              <MessageSquare size={14} /> Start conversation
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
                  className={`flex ${message.sender_party === "vendor" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.sender_party === "vendor" ? "bg-blue-600 text-white" : "border border-line bg-white"}`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-6">
                      {message.body}
                    </p>
                    <p
                      className={`mt-2 text-[10px] ${message.sender_party === "vendor" ? "text-blue-100" : "text-muted"}`}
                    >
                      {message.sender_party === "vendor"
                        ? "Your team"
                        : "Procurement team"}{" "}
                      · {formatActivityDate(message.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <form action={sendPortalMessage} className="mt-4 space-y-3">
              <input type="hidden" name="conversationId" value={selected.id} />
              <TextArea
                label="Reply"
                name="message"
                required
                maxLength={4000}
              />
              <AdminActionButton>
                <Send size={14} /> Send message
              </AdminActionButton>
            </form>
          </>
        ) : (
          <Empty text="Start a conversation about a transaction or general concern." />
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

function Performance(props: Props) {
  const score = props.performance[0];
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <Panel title="Latest scorecard">
        {score ? (
          <>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="grid size-32 place-items-center rounded-full border-[12px] border-blue-100 text-4xl font-bold text-blue-700">
                {score.overall_score.toFixed(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold">Overall performance</h3>
                <p className="mt-2 text-sm text-muted">
                  {score.period_start} through {score.period_end}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {score.order_count} orders evaluated
                </p>
                <p className="mt-1 text-sm text-muted">
                  Average response: {score.response_time_hours.toFixed(1)} hours
                </p>
              </div>
            </div>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <Score
                label="On-time delivery"
                value={score.on_time_delivery_rate}
              />
              <Score label="Order fulfillment" value={score.fulfillment_rate} />
              <Score label="Quality" value={score.quality_score} />
              <Score label="Accuracy" value={score.accuracy_score} />
            </div>
            <PerformanceTrend scores={props.performance} />
          </>
        ) : (
          <Empty text="A scorecard will appear after the procurement team calculates a performance period." />
        )}
      </Panel>
      <div className="space-y-5">
        <Panel title="Reviews">
          {props.reviews.map((review) => (
            <div
              key={review.id}
              className="border-b border-line py-3 text-sm last:border-0"
            >
              <div className="flex justify-between">
                <strong>{humanize(review.action)}</strong>
                <span className="text-xs text-muted">{review.review_date}</span>
              </div>
              <p className="mt-1 text-muted">{review.summary}</p>
            </div>
          ))}
          {!props.reviews.length && (
            <Empty text="No formal reviews recorded." />
          )}
        </Panel>
        <Panel title="Improvement plans">
          {props.improvements.map((plan) => (
            <div key={plan.id} className="mb-3 rounded-xl bg-mist p-3">
              <div className="flex justify-between">
                <strong className="text-sm">{plan.title}</strong>
                <Status value={plan.status} />
              </div>
              <p className="mt-2 text-xs text-muted">Due {plan.due_date}</p>
              <p className="mt-2 text-sm">{plan.objectives}</p>
            </div>
          ))}
          {!props.improvements.length && (
            <p className="text-sm text-muted">No active improvement plan.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

function VendorHistory(props: Props) {
  const [filter, setFilter] = useState("all");
  const activity = props.activity.filter(
    (event) => filter === "all" || historyGroup(event.kind) === filter,
  );
  const totalOrdered = props.orders.reduce(
    (sum, order) => sum + Number(order.amount ?? 0),
    0,
  );
  const totalInvoiced = props.invoices.reduce(
    (sum, invoice) => sum + Number(invoice.total_amount),
    0,
  );
  const paid = props.payments.filter((payment) => payment.status === "paid");
  const totalPaid = paid.reduce(
    (sum, payment) => sum + Number(payment.amount),
    0,
  );

  return (
    <div className="space-y-5">
      <div className="grid overflow-hidden rounded-2xl border border-line bg-white shadow-sm sm:grid-cols-3">
        <HistoryMetric
          label="Purchase orders"
          value={formatPhpCurrency(totalOrdered)}
          count={props.orders.length}
        />
        <HistoryMetric
          label="Invoices"
          value={formatPhpCurrency(totalInvoiced)}
          count={props.invoices.length}
        />
        <HistoryMetric
          label="Paid"
          value={formatPhpCurrency(totalPaid)}
          count={paid.length}
        />
      </div>
      <Panel
        title="Vendor activity history"
        action={
          <select
            aria-label="Filter activity history"
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
    return <Empty text="Transactions and profile changes will appear here." />;
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
    <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bell;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="border-b border-r border-line p-5">
      <Icon className="text-blue-600" size={20} />
      <p className="mt-4 text-sm text-muted">{label}</p>
      <strong className="mt-1 block text-3xl">{value}</strong>
    </div>
  );
}
function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-mist p-3">
      <p className="text-xs text-muted">{label}</p>
      <strong className="mt-1 block break-words text-sm">{value}</strong>
    </div>
  );
}
function Status({ value }: { value: string }) {
  const good = [
    "active",
    "approved",
    "verified",
    "confirmed",
    "delivered",
    "paid",
    "matched",
  ].includes(value);
  const bad = [
    "rejected",
    "suspended",
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
function LinkCard({
  href,
  title,
  detail,
  icon: Icon,
}: {
  href: string;
  title: string;
  detail: string;
  icon: typeof Bell;
}) {
  return (
    <a
      href={href}
      className="mb-3 flex items-center gap-3 rounded-xl border border-line p-4 transition hover:border-blue-200 hover:bg-blue-50"
    >
      <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
        <Icon size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-sm">{title}</strong>
        <span className="mt-1 block text-xs text-muted">{detail}</span>
      </span>
    </a>
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
        className="min-h-28 w-full rounded-xl border border-line bg-white p-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}
function Check({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-4 rounded border-line text-blue-600"
      />
      <span>{label}</span>
    </label>
  );
}
function Select({
  label,
  name,
  values,
  defaultValue,
}: {
  label: string;
  name: string;
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
function Empty({ text }: { text: string }) {
  return (
    <div className="py-8 text-center">
      <CheckCircle2 className="mx-auto text-blue-300" size={24} />
      <p className="mt-3 text-sm text-muted">{text}</p>
    </div>
  );
}
function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
