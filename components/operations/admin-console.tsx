import {
  Activity,
  Building2,
  CheckCircle2,
  CircleAlert,
  Clock3,
  KeyRound,
  MapPin,
  Plus,
  Save,
  ShieldCheck,
  UserPlus,
  Users,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import { AdminActionButton } from "@/components/operations/admin-action-button";
import {
  inviteMember,
  saveWarehouse,
  setWarehouseAssignment,
  updateMember,
  updateOrganization,
} from "@/app/(app)/dashboard/administration/actions";
import type { Database, Json } from "@/types/database";

type Role = Database["public"]["Enums"]["organization_role"];
type MembershipStatus = Database["public"]["Enums"]["membership_status"];

export type AdminMember = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  role: Role;
  status: MembershipStatus;
  invitedAt: string | null;
  createdAt: string;
};

export type AdminWarehouse = {
  id: string;
  code: string;
  name: string;
  city: string | null;
  countryCode: string | null;
  isActive: boolean;
};

export type AdminAssignment = {
  id: string;
  warehouseId: string;
  membershipId: string;
};

export type AdminAuditEvent = {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  metadata: Json;
  occurredAt: string;
};

type Props = {
  organization: { id: string; name: string; slug: string };
  currentUserId: string;
  currentRole: Role;
  members: AdminMember[];
  warehouses: AdminWarehouse[];
  assignments: AdminAssignment[];
  auditEvents: AdminAuditEvent[];
  inviteEnabled: boolean;
  success?: string;
  error?: string;
  setupError?: string;
};

const manageableRoles: Array<{ value: Exclude<Role, "owner">; label: string }> =
  [
    { value: "admin", label: "Administrator" },
    { value: "procurement_manager", label: "Procurement manager" },
    { value: "buyer", label: "Buyer" },
    { value: "warehouse_manager", label: "Warehouse manager" },
    { value: "operator", label: "Warehouse operator" },
    { value: "viewer", label: "Viewer" },
    { value: "hr_manager", label: "HR manager" },
    { value: "recruiter", label: "Recruiter" },
  ];

const roleAccess = [
  { role: "Owner", scope: "Workspace governance, roles, every operations module, and recruitment" },
  { role: "Administrator", scope: "Every operations module and recruitment; no ownership or member-role changes" },
  { role: "Procurement manager", scope: "Products, suppliers, requisitions, sourcing, purchase orders, and logistics" },
  { role: "Buyer", scope: "Products, suppliers, sourcing records, purchase orders, and logistics" },
  { role: "Warehouse manager", scope: "Warehouses, products, stock movements, tasks, transfers, and logistics" },
  { role: "Warehouse operator", scope: "Stock movements, warehouse tasks, transfers, and cycle counts" },
  { role: "HR manager", scope: "Job openings, applicants, hiring pipeline, and assisted screening" },
  { role: "Recruiter", scope: "Applicant intake, hiring pipeline, screening; job openings are read-only" },
  { role: "Viewer", scope: "Read-only operational access; applicant records are excluded" },
] as const;

const fieldClass =
  "h-10 w-full rounded-lg border border-line bg-white px-3 text-xs text-ink outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-3 focus:ring-blue-100";
const labelClass =
  "mb-2 block text-[10px] font-bold uppercase tracking-[.06em] text-muted";

export function AdminConsole(props: Props) {
  const activeMembers = props.members.filter(
    (member) => member.status === "active",
  );
  const activeWarehouses = props.warehouses.filter(
    (warehouse) => warehouse.isActive,
  );
  const isOwner = props.currentRole === "owner";

  if (!isOwner) {
    return <AccessDenied role={props.currentRole} />;
  }

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 xl:p-10">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow text-muted">Workspace governance</p>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-[-.045em]">
              Administration
            </h1>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 font-mono text-[8px] font-medium text-blue-700">
              OWNER ACCESS
            </span>
          </div>
          <p className="mt-2 text-xs text-muted">
            Manage organization identity, people, roles, warehouses, and access
            scope.
          </p>
        </div>
        <nav className="hide-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-xl border border-line bg-white p-1 text-[10px] font-semibold">
          <a href="#people" className="rounded-lg px-3 py-2 hover:bg-mist">
            People
          </a>
          <a href="#roles" className="rounded-lg px-3 py-2 hover:bg-mist">
            Roles
          </a>
          <a
            href="#organization"
            className="rounded-lg px-3 py-2 hover:bg-mist"
          >
            Organization
          </a>
          <a href="#warehouses" className="rounded-lg px-3 py-2 hover:bg-mist">
            Warehouses
          </a>
          <a href="#assignments" className="rounded-lg px-3 py-2 hover:bg-mist">
            Assignments
          </a>
          <a href="#audit" className="rounded-lg px-3 py-2 hover:bg-mist">
            Audit
          </a>
        </nav>
      </header>

      {(props.success || props.error || props.setupError) && (
        <div
          className={`mt-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-xs ${props.error || props.setupError ? "border-red-200 bg-red-50 text-red-800" : "border-blue-200 bg-blue-50 text-blue-800"}`}
          role="status"
        >
          {props.error || props.setupError ? (
            <CircleAlert className="mt-0.5 shrink-0" size={15} />
          ) : (
            <CheckCircle2 className="mt-0.5 shrink-0" size={15} />
          )}
          <span>{props.error ?? props.setupError ?? props.success}</span>
        </div>
      )}

      <div className="mt-6 grid border-l border-t border-line bg-white sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            icon: Users,
            label: "Active members",
            value: activeMembers.length,
            detail: `${props.members.length} total records`,
          },
          {
            icon: KeyRound,
            label: "Administrators",
            value: props.members.filter(
              (member) => member.role === "owner" || member.role === "admin",
            ).length,
            detail: "Owner and admin",
          },
          {
            icon: WarehouseIcon,
            label: "Active warehouses",
            value: activeWarehouses.length,
            detail: `${props.warehouses.length} configured`,
          },
          {
            icon: Activity,
            label: "Audit events",
            value: props.auditEvents.length,
            detail: "Recent activity shown",
          },
        ].map(({ icon: Icon, label, value, detail }) => (
          <div key={label} className="border-b border-r border-line p-5">
            <div className="flex items-center justify-between text-[10px] font-semibold text-muted">
              {label}
              <Icon size={15} />
            </div>
            <p className="mt-4 text-2xl font-bold tracking-[-.04em]">{value}</p>
            <p className="mt-1 text-[9px] text-muted">{detail}</p>
          </div>
        ))}
      </div>

      <section id="roles" className="mt-6 scroll-mt-24 border border-line bg-white">
        <SectionHeader icon={ShieldCheck} title="Role-based access control" description="Permissions are verified in the interface, every server action, and database row policies." />
        <div className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-3">
          {roleAccess.map((item) => <article key={item.role} className="bg-white p-5"><div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-lg bg-blue-50 text-blue-700"><KeyRound size={13} /></span><h3 className="text-xs font-bold">{item.role}</h3></div><p className="mt-3 text-[10px] leading-5 text-muted">{item.scope}</p></article>)}
        </div>
      </section>

      <section
        id="people"
        className="mt-6 scroll-mt-24 border border-line bg-white"
      >
        <SectionHeader
          icon={Users}
          title="People and permissions"
          description="Invite teammates and control organization-level access."
        />
        <div className="grid xl:grid-cols-[360px_1fr]">
          <div className="border-b border-line p-5 xl:border-b-0 xl:border-r">
            <h3 className="text-xs font-bold">Invite a team member</h3>
            <p className="mt-2 text-[10px] leading-5 text-muted">
              A secure invitation is sent by email. Access activates after the
              user accepts and sets a password.
            </p>
            {!props.inviteEnabled && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[10px] leading-5 text-amber-900">
                The secure invitation service is not configured. Ask a system
                administrator to enable server-side invitations.
              </div>
            )}
            <form action={inviteMember} className="mt-5 space-y-4">
              <input
                type="hidden"
                name="organizationId"
                value={props.organization.id}
              />
              <Field
                label="Full name"
                name="fullName"
                placeholder="Alex Rivera"
              />
              <Field
                label="Work email"
                name="email"
                type="email"
                placeholder="alex@company.com"
              />
              <label className="block">
                <span className={labelClass}>Initial role</span>
                <select
                  name="role"
                  className={fieldClass}
                  defaultValue="viewer"
                >
                  {manageableRoles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>
              <AdminActionButton
                className="w-full"
                variant="primary"
                disabled={!props.inviteEnabled}
              >
                <UserPlus size={13} /> Send invitation
              </AdminActionButton>
            </form>
          </div>

          <div className="min-w-0 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-line bg-mist/60 font-mono text-[8px] uppercase tracking-wider text-muted">
                  <th className="px-5 py-3 font-medium">Team member</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Added</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {props.members.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    organizationId={props.organization.id}
                    isCurrentUser={member.userId === props.currentUserId}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section
          id="organization"
          className="scroll-mt-24 border border-line bg-white"
        >
          <SectionHeader
            icon={Building2}
            title="Organization settings"
            description="Identity used across documents, workspaces, and references."
          />
          <form
            action={updateOrganization}
            className="grid gap-4 p-5 sm:grid-cols-2"
          >
            <input
              type="hidden"
              name="organizationId"
              value={props.organization.id}
            />
            <Field
              label="Organization name"
              name="name"
              defaultValue={props.organization.name}
            />
            <Field
              label="Workspace slug"
              name="slug"
              defaultValue={props.organization.slug}
            />
            <div className="sm:col-span-2 flex justify-end">
              <AdminActionButton>
                <Save size={13} /> Save organization
              </AdminActionButton>
            </div>
          </form>
        </section>

        <section
          id="assignments"
          className="scroll-mt-24 border border-line bg-white"
        >
          <SectionHeader
            icon={ShieldCheck}
            title="Warehouse assignments"
            description="Narrow field access to specific operational locations."
          />
          <form
            action={setWarehouseAssignment}
            className="grid gap-3 p-5 sm:grid-cols-[1fr_1fr_auto]"
          >
            <input
              type="hidden"
              name="organizationId"
              value={props.organization.id}
            />
            <input type="hidden" name="operation" value="assign" />
            <select
              name="membershipId"
              className={fieldClass}
              required
              defaultValue=""
            >
              <option value="" disabled>
                Choose team member
              </option>
              {activeMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName}
                </option>
              ))}
            </select>
            <select
              name="warehouseId"
              className={fieldClass}
              required
              defaultValue=""
            >
              <option value="" disabled>
                Choose warehouse
              </option>
              {activeWarehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} · {warehouse.name}
                </option>
              ))}
            </select>
            <AdminActionButton>
              <Plus size={13} /> Assign
            </AdminActionButton>
          </form>
          <div className="border-t border-line px-5 py-2">
            {props.assignments.length === 0 ? (
              <EmptyLine text="No warehouse-specific assignments yet." />
            ) : (
              props.assignments.map((assignment) => {
                const member = props.members.find(
                  (item) => item.id === assignment.membershipId,
                );
                const warehouse = props.warehouses.find(
                  (item) => item.id === assignment.warehouseId,
                );
                return (
                  <div
                    key={assignment.id}
                    className="flex items-center gap-3 border-b border-line py-3 last:border-0"
                  >
                    <span className="grid size-8 place-items-center rounded-lg bg-blue-50 text-accent">
                      <MapPin size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold">
                        {member?.fullName ?? "Unknown member"}
                      </p>
                      <p className="mt-0.5 truncate text-[9px] text-muted">
                        {warehouse?.code} · {warehouse?.name}
                      </p>
                    </div>
                    <form action={setWarehouseAssignment}>
                      <input
                        type="hidden"
                        name="organizationId"
                        value={props.organization.id}
                      />
                      <input
                        type="hidden"
                        name="membershipId"
                        value={assignment.membershipId}
                      />
                      <input
                        type="hidden"
                        name="warehouseId"
                        value={assignment.warehouseId}
                      />
                      <input type="hidden" name="operation" value="remove" />
                      <AdminActionButton variant="danger">
                        Remove
                      </AdminActionButton>
                    </form>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <section
        id="warehouses"
        className="mt-6 scroll-mt-24 border border-line bg-white"
      >
        <SectionHeader
          icon={WarehouseIcon}
          title="Warehouse directory"
          description="Create locations and deactivate facilities without deleting operational history."
        />
        <div className="border-b border-line bg-mist/45 p-5">
          <form
            action={saveWarehouse}
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[.7fr_1.3fr_1fr_.5fr_auto_auto] xl:items-end"
          >
            <input
              type="hidden"
              name="organizationId"
              value={props.organization.id}
            />
            <input type="hidden" name="warehouseId" value="" />
            <Field label="Code" name="code" placeholder="MNL-01" />
            <Field
              label="Warehouse name"
              name="name"
              placeholder="Manila Central"
            />
            <Field label="City" name="city" placeholder="Manila" />
            <Field
              label="Country"
              name="countryCode"
              placeholder="PH"
              maxLength={2}
            />
            <label className="flex h-10 items-center gap-2 text-[10px] font-semibold">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked
                className="size-4 accent-blue-600"
              />{" "}
              Active
            </label>
            <AdminActionButton>
              <Plus size={13} /> Add warehouse
            </AdminActionButton>
          </form>
        </div>
        <div className="grid gap-px bg-line md:grid-cols-2 xl:grid-cols-3">
          {props.warehouses.length === 0 ? (
            <div className="bg-white p-6">
              <EmptyLine text="No warehouses configured." />
            </div>
          ) : (
            props.warehouses.map((warehouse) => (
              <WarehouseForm
                key={warehouse.id}
                warehouse={warehouse}
                organizationId={props.organization.id}
              />
            ))
          )}
        </div>
      </section>

      <section
        id="audit"
        className="mt-6 scroll-mt-24 border border-line bg-white"
      >
        <SectionHeader
          icon={Activity}
          title="Audit history"
          description="Immutable governance events recorded by secure database operations."
        />
        <div className="divide-y divide-line">
          {props.auditEvents.length === 0 ? (
            <div className="p-5">
              <EmptyLine text="No administration events recorded yet." />
            </div>
          ) : (
            props.auditEvents.map((event) => {
              const actor = props.members.find(
                (member) => member.userId === event.actorId,
              );
              return (
                <div
                  key={event.id}
                  className="grid gap-3 px-5 py-4 sm:grid-cols-[32px_1fr_auto] sm:items-center"
                >
                  <span className="grid size-8 place-items-center rounded-lg bg-mist text-muted">
                    <Clock3 size={14} />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold">
                      {humanizeAction(event.action)}
                    </p>
                    <p className="mt-1 text-[9px] text-muted">
                      {actor?.fullName ?? "System"} · {event.entityType}
                    </p>
                  </div>
                  <time className="font-mono text-[9px] text-muted">
                    {formatDate(event.occurredAt)}
                  </time>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function MemberRow({
  member,
  organizationId,
  isCurrentUser,
}: {
  member: AdminMember;
  organizationId: string;
  isCurrentUser: boolean;
}) {
  const owner = member.role === "owner";
  return (
    <tr className="border-b border-line last:border-0">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-[9px] font-bold text-white">
            {initials(member.fullName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold">
              {member.fullName}{" "}
              {isCurrentUser && <span className="text-muted">(you)</span>}
            </p>
            <p className="mt-0.5 truncate text-[9px] text-muted">
              {member.email}
            </p>
          </div>
        </div>
      </td>
      {owner ? (
        <>
          <td className="px-4 py-4">
            <span className="rounded-full bg-blue-50 px-2 py-1 font-mono text-[8px] text-blue-700">
              OWNER
            </span>
          </td>
          <td className="px-4 py-4">
            <StatusBadge status={member.status} />
          </td>
          <td className="px-4 py-4 font-mono text-[9px] text-muted">
            {formatDate(member.createdAt)}
          </td>
          <td className="px-5 py-4 text-right text-[9px] text-muted">
            Protected
          </td>
        </>
      ) : (
        <MemberEditCells member={member} organizationId={organizationId} />
      )}
    </tr>
  );
}

function MemberEditCells({
  member,
  organizationId,
}: {
  member: AdminMember;
  organizationId: string;
}) {
  const formId = `member-${member.id}`;
  return (
    <>
      <td className="px-4 py-3">
        <select
          form={formId}
          name="role"
          defaultValue={member.role}
          className="h-9 w-44 rounded-lg border border-line bg-white px-2 text-[10px]"
        >
          {manageableRoles.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <select
          form={formId}
          name="status"
          defaultValue={member.status}
          className="h-9 w-28 rounded-lg border border-line bg-white px-2 text-[10px]"
        >
          <option value="invited">Invited</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </td>
      <td className="px-4 py-4 font-mono text-[9px] text-muted">
        {formatDate(member.invitedAt ?? member.createdAt)}
      </td>
      <td className="px-5 py-3 text-right">
        <form id={formId} action={updateMember}>
          <input type="hidden" name="organizationId" value={organizationId} />
          <input type="hidden" name="membershipId" value={member.id} />
          <AdminActionButton variant="secondary">
            <Save size={12} /> Save
          </AdminActionButton>
        </form>
      </td>
    </>
  );
}

function WarehouseForm({
  warehouse,
  organizationId,
}: {
  warehouse: AdminWarehouse;
  organizationId: string;
}) {
  return (
    <form
      action={saveWarehouse}
      className="grid gap-3 bg-white p-5 sm:grid-cols-2"
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="warehouseId" value={warehouse.id} />
      <Field label="Code" name="code" defaultValue={warehouse.code} />
      <Field label="Name" name="name" defaultValue={warehouse.name} />
      <Field label="City" name="city" defaultValue={warehouse.city ?? ""} />
      <Field
        label="Country"
        name="countryCode"
        defaultValue={warehouse.countryCode ?? ""}
        maxLength={2}
      />
      <label className="flex h-9 items-center gap-2 text-[10px] font-semibold">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={warehouse.isActive}
          className="size-4 accent-blue-600"
        />{" "}
        Active location
      </label>
      <AdminActionButton variant="secondary">
        <Save size={12} /> Save changes
      </AdminActionButton>
    </form>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Users;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-line px-5 py-4">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-accent">
        <Icon size={15} />
      </span>
      <div>
        <h2 className="text-sm font-bold">{title}</h2>
        <p className="mt-1 text-[10px] text-muted">{description}</p>
      </div>
    </div>
  );
}

function Field(
  props: React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    name: string;
  },
) {
  const { label, ...inputProps } = props;
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input required className={fieldClass} {...inputProps} />
    </label>
  );
}

function StatusBadge({ status }: { status: MembershipStatus }) {
  const tone =
    status === "active"
      ? "bg-blue-50 text-blue-700"
      : status === "invited"
        ? "bg-amber-50 text-amber-800"
        : "bg-red-50 text-red-700";
  return (
    <span className={`rounded-full px-2 py-1 font-mono text-[8px] ${tone}`}>
      {status.toUpperCase()}
    </span>
  );
}

function AccessDenied({ role }: { role: Role }) {
  return (
    <div className="grid min-h-[calc(100vh-64px)] place-items-center p-6">
      <div className="max-w-md rounded-2xl border border-line bg-white p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-700">
          <ShieldCheck size={21} />
        </span>
        <h1 className="mt-5 text-xl font-bold">Owner access required</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Your current role is <strong>{role.replaceAll("_", " ")}</strong>.
          Organization administration is restricted to the owner.
        </p>
      </div>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 py-3 text-[10px] text-muted">
      <CircleAlert size={13} /> {text}
    </p>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function humanizeAction(action: string) {
  return action
    .split(".")
    .map((part) => part.replaceAll("_", " "))
    .join(" · ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
