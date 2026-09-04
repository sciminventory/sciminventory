# Product architecture

This document is the design gate for Phase 1. It defines the product boundaries that later implementation phases must preserve.

## 1. Complete information architecture

### Public product

- Home: product thesis, workflow preview, capabilities, security, and conversion.
- Product: Features, Inventory, Procurement, Warehousing, Suppliers, Logistics.
- Solutions: Retail, Distribution, Wholesale, Manufacturing, Food & Beverage, Healthcare Supply Chain, Construction, Multi-branch.
- Trust: Pricing, Security, About, Contact, Resources.
- Access: Sign in, Sign up.

### Authenticated workspace

- Overview: attention queue, operational health, inbound work, exceptions, recent movements.
- Inventory
  - Products, stock overview, stock movements, transfers, adjustments, cycle counts.
- Warehouse
  - Receiving, putaway, picking, packing, warehouses and locations.
- Procurement
  - Purchase requisitions, RFQs, quotations, quotation comparison, purchase orders.
- Suppliers
  - Directory, contacts, performance, documents, product catalog.
- Logistics
  - Shipments, delivery records, document tracking.
- Analytics
  - Inventory, procurement, suppliers, warehousing.
- Administration
  - Users and roles, warehouses, units, document types, settings, audit logs.

The global shell owns organization and warehouse scope, universal search, notifications, quick-create, help, and user controls. Frequently inspected records use a drawer; long workflows and anything requiring its own URL, audit context, or multi-tab editing use a dedicated page.

## 2. Database domain boundaries

| Boundary | Owns | Never owns |
| --- | --- | --- |
| Identity & tenancy | profiles, organizations, memberships, roles, warehouse assignments | operational quantities |
| Product master | products, variants, UOM, categories, brands, tracking policy | stock-on-hand truth |
| Inventory ledger | movements, balance projections, reservations, lots, serials | procurement approvals |
| Warehouse execution | receipts, inspections, putaway, picks, packs, location tasks | supplier commercial terms |
| Procurement | requisitions, approval runs, RFQs, quotations, awards, POs | physical receipt posting |
| Supplier | companies, contacts, qualifications, performance, documents | inventory balances |
| Logistics | shipments, milestones, delivery records, transport documents | warehouse location hierarchy |
| Platform governance | audit events, entitlements, saved views, notifications | duplicated domain state |

Cross-domain actions are coordinated by database transactions and domain services. Inventory movements are immutable facts; balances are transactionally maintained projections. Attachments store metadata in PostgreSQL and objects in private Storage buckets.

## 3. Procurement workflow

`Need → Draft requisition → Submitted → Approval policy evaluation → Approved → RFQ → Supplier quotations → Commercial/lead-time comparison → Award → Purchase order → Approval → Supplier confirmation`

- Thresholds, department, category, and warehouse determine approval steps.
- Approval steps are snapshotted when submitted, so later policy edits cannot rewrite history.
- Rejections and change requests append decisions; they do not erase earlier decisions.
- A requisition can be partially sourced or converted. Every PO line traces to its source line where applicable.
- Dangerous actions—award, PO approval, cancellation, and price overrides—require permission, confirmation, and audit events.

## 4. Inventory workflow

`Controlled operation → Validate scope and availability → Lock affected balance rows → Append movements → Update balance projection → Append audit event → Commit`

- Quantities are never directly edited from the browser.
- Available quantity is derived from on-hand minus reserved and blocked quantities according to policy.
- Transfers create distinct dispatch and receipt facts; in-transit stock remains visible.
- Cycle counts freeze a count snapshot, capture blind counts where configured, require review, then post variance movements.
- Batch, serial, expiration, quarantine, and unit-conversion rules live in domain services and database constraints.
- Idempotency keys protect scans and retryable operational submissions.

## 5. Warehouse workflow

`Expected delivery → Dock assignment → Receive against PO → Discrepancy capture → Quality inspection → Accept or quarantine → Putaway task → Bin confirmation → Available stock`

- Receiving is optimized for tablet and scanners: large hit targets, persistent context, no decorative motion.
- Partial receiving leaves PO quantities open. Over-receipt requires policy permission.
- Receipt posting is atomic across receipt lines, movements, balances, PO progress, and audit.
- Accepted goods remain in receiving/staging until putaway is confirmed.
- FEFO suggestions are used for expiration-controlled picking; operators must record exceptions.

## 6. Roles and permission matrix

| Capability | Owner | Admin | Procurement manager | Buyer | Warehouse manager | Operator | Viewer |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Manage organization and roles | ✓ | ✓ | — | — | — | — | — |
| View product and stock | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View inventory cost | ✓ | ✓ | ✓ | ✓ | configurable | — | configurable |
| Submit requisition | ✓ | ✓ | ✓ | ✓ | ✓ | configurable | — |
| Approve requisition / PO | ✓ | configurable | ✓ | — | threshold-based | — | — |
| Manage RFQ / quotation | ✓ | ✓ | ✓ | ✓ | — | — | — |
| Receive / put away / pick | ✓ | ✓ | — | — | ✓ | ✓ | — |
| Adjust or post count | ✓ | ✓ | — | — | ✓ | request only | — |
| View audit log | ✓ | ✓ | scoped | — | scoped | — | — |

Roles provide defaults; permissions are evaluated server-side and may later support custom roles. Warehouse assignment further narrows operational access. Permission checks never depend on hidden controls alone.

## 7. Multi-tenant architecture

- Every tenant record carries `organization_id`; child foreign keys include tenant-consistency constraints where practical.
- Supabase Auth identifies the actor. Memberships establish tenant access. Warehouse assignments narrow location scope.
- RLS is the final enforcement layer, backed by `SECURITY DEFINER` membership helper functions with a fixed search path.
- Server components derive scope from authenticated membership records, never from an arbitrary browser global.
- Mutations re-check organization, warehouse, permission, status transition, and quantities inside the transaction.
- Active organization is a user preference, not an authorization grant.

## 8. Logical ERD

```text
auth.users ──1:1── profiles
    │
    └──< organization_memberships >── organizations ──< business_units
                    │                         │
                    └── role                 └──< warehouses ──< warehouse_assignments
                                              │
                                              ├──< product master (Phase 4)
                                              ├──< procurement records (Phase 7)
                                              ├──< warehouse records (Phase 9)
                                              ├──< logistics records (Phase 10)
                                              └──< audit_events
```

Phase 1 implements the identity, tenancy, warehouse root, and audit spine. Domain migrations extend this spine without weakening its tenant guarantees.

## 9. Supabase schema approach

- `public` contains application tables, constrained enums, indexes, and RPC entry points.
- Migrations are append-only and reviewed. Generated TypeScript database types are refreshed after each schema change.
- Critical multi-write operations are PostgreSQL functions invoked through typed repositories.
- Timestamps use `timestamptz`; money will use ISO currency plus integer minor units or constrained numeric values; quantities use constrained `numeric` precision.
- Soft deletion is used only where history is required. Immutable ledgers and audit records cannot be updated by normal roles.

## 10. RLS strategy

RLS is enabled and forced on tenant tables. Select policies require active membership. Writes require both membership and role/permission. Ownership creation occurs through a transactional onboarding RPC. Audit rows are insert-only through controlled functions and selectively readable. Service-role access is restricted to trusted server and maintenance paths and is never exposed to the client.

RLS tests must cover cross-tenant reads, guessed IDs, inactive membership, warehouse scope, role downgrade, and private documents.

## 11. Storage strategy

- `organization-documents`: private bucket for procurement, supplier, logistics, receipt, adjustment, and count evidence.
- Object path: `{organization_id}/{domain}/{entity_id}/{uuid}-{sanitized_filename}`.
- Storage RLS validates the first path segment against active membership.
- Signed downloads are short-lived and created server-side after entity-level authorization.
- File metadata, category, verification state, uploader, checksum, and audit references remain in PostgreSQL.
- Future antivirus scanning uses quarantine metadata before an object becomes downloadable.

## 12. Next.js folder structure

```text
app/
  (marketing)/              public storytelling layout
  (auth)/                   sign-in and sign-up layout
  (app)/                    protected operations shell
  auth/callback/            Supabase PKCE exchange
components/
  marketing/  operations/  auth/  ui/
lib/
  auth/  permissions/  supabase/  validations/  utils/
supabase/migrations/
types/
```

Pages are server components by default. Client boundaries are limited to forms, interactive controls, and theme behavior. Domain mutations will live in `lib/services`, queries in repositories, and schemas in validations.

## 13. Component architecture

- Primitives: button, input, badge, separator, skeleton, table scaffolding.
- Marketing compositions: header, product frame, workflow story, CTA, footer.
- Operations compositions: sidebar, utility bar, attention summary, filter bar, dense table, detail drawer, workflow timeline.
- Domain components consume typed view models—not raw Supabase response shapes.
- Status appearance is centrally mapped and always paired with text/iconography.

## 14. Design system

The system uses a cool neutral base, deep ink, operational blue for primary action, emerald for confirmed/healthy, amber for attention, and red only for destructive/critical states. Radius is modest in the app and more generous in marketing. Operations use a 4px spacing rhythm, 13–14px working text, tabular numerals, strong focus rings, thin separators, and flat grouped surfaces. Marketing can use larger type, controlled depth, and subtle background light. Dark mode preserves table contrast and does not invert semantic meaning.

## 15. Public SaaS landing-page structure

`Header → Hero and live product frame → Operational capabilities → Interactive lifecycle → Warehouse execution → Procurement → Inventory visibility → Supplier collaboration → Logistics records → Analytics → Security → Integrations → CTA → Footer`

The product frame uses credible fictional operational data clearly presented as a demonstration, never as customer claims or platform-scale proof.

## 16. Authenticated application structure

The shell stays stable while work changes inside it. Desktop prioritizes planning and dense comparison; tablet routes emphasize receive, putaway, count, transfer, and pick; mobile prioritizes approvals, notifications, stock lookup, and constrained task completion. Destructive and financial actions are separated visually and confirmed. High-frequency work should finish inline or in a drawer; complex audited records retain a full page.

## 17. Implementation roadmap

1. Foundation: architecture, auth, tenancy, permissions, RLS, design tokens, layouts.
2. Marketing: full public narrative, interactive preview, authentication entry points.
3. App shell: selectors, command palette, notification center, responsive navigation.
4. Product and inventory master.
5. Inventory operations and immutable ledger.
6. Supplier management.
7. Requisitions, approvals, RFQs, quotations, and award.
8. Purchase orders, confirmation, and documents.
9. Receiving, inspection, putaway, and handheld work.
10. Shipments and logistics documents.
11. Analytics, reports, and audited XLSX exports.
12. Security, concurrency, performance, accessibility, and RLS hardening.

Each phase adds schema, RLS, domain services, accessible UI states, and workflow tests together. No phase may bypass the inventory ledger or weaken organization isolation to move faster.

## Page-level UX review gate

Every implementation ticket must answer these questions before UI work begins:

| Review question | Product rule |
| --- | --- |
| What must the user accomplish? | State one job and optimize the page around its completion. |
| What needs attention now? | Put exceptions before passive reporting; show cause and next action. |
| What is most frequent? | Keep it visible, keyboard reachable, and low-friction. |
| What is most dangerous? | Separate it, name the consequence, confirm it, authorize it, and audit it. |
| What can finish here? | Permit safe status updates and short edits without navigation. |
| What belongs in a drawer? | Use for quick inspection or a short contextual action that preserves list position. |
| What deserves a page? | Use for multi-step, multi-tab, deeply linked, printable, or heavily audited records. |
| What happens at scale? | Query, filter, sort, and paginate on the server; never hydrate an unbounded dataset. |
| What happens with missing data? | Label unknown values and explain the recovery action; never silently coerce to zero. |
| What happens on smaller devices? | Recompose around the field task; do not merely compress the desktop table. |
| What requires confirmation? | Irreversible, external, financial, or inventory-affecting actions. |
| What requires an audit record? | Permission, approval, commercial, document-verification, status, and stock changes. |

The design review rejects oversized operational headings, decorative KPI grids, repetitive card shells, icon tiles without meaning, low-density desktop tables, and motion that delays warehouse work.
