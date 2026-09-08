import type { OperationalModule } from "@/lib/operations/modules";
import type { Database } from "@/types/database";

export type OrganizationRole = Database["public"]["Enums"]["organization_role"];

export type AppPermission =
  | "organization.manage"
  | "members.manage"
  | "operations.read"
  | "procurement.read"
  | "logistics.read"
  | "documents.read"
  | "warehouses.manage"
  | "inventory.manage"
  | "product_master.manage"
  | "procurement.manage"
  | "logistics.manage"
  | "documents.manage"
  | "vendors.read"
  | "vendors.manage"
  | "recruitment.read"
  | "recruitment.jobs.manage"
  | "recruitment.applicants.manage"
  | "recruitment.pipeline.manage"
  | "recruitment.screening.run";

const allPermissions: AppPermission[] = [
  "organization.manage", "members.manage", "warehouses.manage", "inventory.manage",
  "product_master.manage", "procurement.manage", "logistics.manage", "documents.manage",
  "vendors.read", "vendors.manage",
  "operations.read", "procurement.read", "logistics.read", "documents.read",
  "recruitment.read", "recruitment.jobs.manage", "recruitment.applicants.manage",
  "recruitment.pipeline.manage", "recruitment.screening.run",
];

const rolePermissions: Record<OrganizationRole, readonly AppPermission[]> = {
  owner: allPermissions,
  admin: allPermissions.filter((permission) => permission !== "organization.manage" && permission !== "members.manage"),
  procurement_manager: ["operations.read", "procurement.read", "logistics.read", "documents.read", "vendors.read", "vendors.manage", "product_master.manage", "procurement.manage", "logistics.manage"],
  buyer: ["operations.read", "procurement.read", "logistics.read", "documents.read", "vendors.read", "vendors.manage", "product_master.manage", "procurement.manage", "logistics.manage"],
  warehouse_manager: ["operations.read", "logistics.read", "documents.read", "vendors.read", "warehouses.manage", "inventory.manage", "product_master.manage", "logistics.manage"],
  operator: ["operations.read", "documents.read", "inventory.manage"],
  viewer: ["operations.read", "procurement.read", "logistics.read", "documents.read", "vendors.read"],
  hr_manager: ["recruitment.read", "recruitment.jobs.manage", "recruitment.applicants.manage", "recruitment.pipeline.manage", "recruitment.screening.run"],
  recruiter: ["recruitment.read", "recruitment.applicants.manage", "recruitment.pipeline.manage", "recruitment.screening.run"],
};

export function hasPermission(role: OrganizationRole, permission: AppPermission) {
  return rolePermissions[role].includes(permission);
}

export function roleRequiresMfa(role: OrganizationRole) {
  return role !== "viewer";
}

export function canManageOperationalModule(module: OperationalModule, role: OrganizationRole) {
  if (module === "stock") return false;
  if (module === "documents") return hasPermission(role, "documents.manage");
  if (["suppliers", "requisitions", "rfqs", "quotations", "purchase_orders"].includes(module)) return hasPermission(role, "procurement.manage");
  if (module === "products") return hasPermission(role, "product_master.manage");
  if (module === "logistics") return hasPermission(role, "logistics.manage");
  if (module === "locations") return ["owner", "admin", "warehouse_manager"].includes(role);
  return hasPermission(role, "inventory.manage");
}

export function canViewOperationalModule(module: OperationalModule, role: OrganizationRole) {
  if (module === "documents") return hasPermission(role, "documents.read");
  if (["suppliers", "requisitions", "rfqs", "quotations", "purchase_orders"].includes(module)) return hasPermission(role, "procurement.read");
  if (module === "logistics") return hasPermission(role, "logistics.read");
  return hasPermission(role, "operations.read");
}

export const roleLabels: Record<OrganizationRole, string> = {
  owner: "Owner",
  admin: "Administrator",
  procurement_manager: "Procurement manager",
  buyer: "Buyer",
  warehouse_manager: "Warehouse manager",
  operator: "Warehouse operator",
  viewer: "Viewer",
  hr_manager: "HR manager",
  recruiter: "Recruiter",
};
