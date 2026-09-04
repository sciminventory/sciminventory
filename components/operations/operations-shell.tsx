"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ArrowRight,
  Boxes,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  ClipboardList,
  Command,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShieldCheck,
  Truck,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";
import { modulePaths } from "@/lib/operations/modules";
import { canManageOperationalModule, canViewOperationalModule, hasPermission, type OrganizationRole } from "@/lib/auth/permissions";

const navigation = [
  { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  {
    label: "Inventory",
    icon: Boxes,
    items: [
      { label: "Products", href: modulePaths.products },
      { label: "Stock", href: modulePaths.stock },
      { label: "Movements", href: modulePaths.movements },
      { label: "Transfers", href: modulePaths.transfers },
      { label: "Cycle counts", href: modulePaths.cycle_counts },
    ],
  },
  {
    label: "Warehouse",
    icon: Warehouse,
    items: [
      { label: "Receiving", href: modulePaths.receiving },
      { label: "Putaway", href: modulePaths.putaway },
      { label: "Picking", href: modulePaths.picking },
      { label: "Locations", href: modulePaths.locations },
    ],
  },
  {
    label: "Procurement",
    icon: ClipboardList,
    items: [
      { label: "Requisitions", href: modulePaths.requisitions },
      { label: "RFQs", href: modulePaths.rfqs },
      { label: "Quotations", href: modulePaths.quotations },
      { label: "Purchase orders", href: modulePaths.purchase_orders },
    ],
  },
  {
    label: "Recruitment",
    icon: BriefcaseBusiness,
    items: [
      { label: "Job openings", href: "/dashboard/recruitment/jobs" },
      { label: "Applicants", href: "/dashboard/recruitment/applicants" },
      { label: "Pipeline", href: "/dashboard/recruitment/pipeline" },
      { label: "AI screening", href: "/dashboard/recruitment/screening" },
    ],
  },
  { label: "Suppliers", icon: Users, href: modulePaths.suppliers },
  { label: "Logistics", icon: Truck, href: modulePaths.logistics },
  { label: "Documents", icon: FileText, href: modulePaths.documents },
] as const;

type Props = {
  children: React.ReactNode;
  workspaceName: string;
  userName: string;
  userRole: OrganizationRole | "preview";
  preview?: boolean;
  logoutAction: () => Promise<void>;
};

export function OperationsShell({
  children,
  workspaceName,
  userName,
  userRole,
  preview,
  logoutAction,
}: Props) {
  const pathname = usePathname();
  const effectiveRole: OrganizationRole = userRole === "preview" ? "owner" : userRole;
  const recruitmentAccess = hasPermission(effectiveRole, "recruitment.read");
  const visibleNavigation = navigation.filter((item) => {
    if (item.label === "Recruitment") return recruitmentAccess;
    if (item.label === "Inventory" || item.label === "Warehouse") return canViewOperationalModule("stock", effectiveRole);
    if (item.label === "Procurement" || item.label === "Suppliers") return canViewOperationalModule("suppliers", effectiveRole);
    if (item.label === "Logistics") return canViewOperationalModule("logistics", effectiveRole);
    if (item.label === "Documents") return canViewOperationalModule("documents", effectiveRole);
    return true;
  });
  const currentGroup = visibleNavigation.find((item) =>
    "items" in item && item.items?.some((sub) => pathname.startsWith(sub.href)),
  )?.label;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState<string>(currentGroup ?? "Inventory");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="operations-app min-h-screen bg-[#f4f7fb] text-ink">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[268px] border-r border-line bg-white shadow-[8px_0_30px_rgba(15,54,104,.035)] transition-[width,transform] duration-300 lg:translate-x-0",
          collapsed && "lg:w-[76px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className={cn("relative flex h-[72px] items-center justify-center border-b border-line px-5", collapsed && "lg:px-2")}>
          <BrandMark iconOnly />
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute right-5 lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
          <button
            onClick={() => setCollapsed((value) => !value)}
            className={cn("hidden size-9 place-items-center rounded-xl border border-line bg-white text-muted transition hover:border-blue-200 hover:bg-blue-50 hover:text-accent lg:absolute lg:right-3 lg:grid", collapsed && "z-10 size-8 rounded-full shadow-md lg:-right-4 lg:top-[82px]")}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
        <div className={cn("border-b border-line p-3", collapsed && "lg:px-2")}>
          <button title={workspaceName} className={cn("flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-mist", collapsed && "lg:justify-center")}>
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-[11px] font-bold text-white shadow-sm">
              ND
            </span>
            <span className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
              <span className="block truncate text-xs font-bold">
                {workspaceName}
              </span>
              <span className="block text-[9px] text-muted">
                Organization workspace
              </span>
            </span>
            <ChevronDown size={13} className={collapsed ? "lg:hidden" : ""} />
          </button>
        </div>
        <nav
          className={cn("h-[calc(100vh-205px)] overflow-y-auto p-3", collapsed && "lg:px-2")}
          aria-label="Application navigation"
        >
          <p className={cn("eyebrow mb-2 px-2 text-muted", collapsed && "lg:hidden")}>Operations</p>
          {visibleNavigation.map(({ label, icon: Icon, ...item }) => {
            const items = "items" in item ? item.items : undefined;
            const href = "href" in item ? item.href : undefined;
            const open = expanded === label || currentGroup === label;
            return (
              <div key={label} className="mb-1">
                {href ? (
                  <Link
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? label : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[12px] font-semibold transition hover:bg-mist",
                      collapsed && "lg:justify-center lg:px-2",
                      (pathname === href || (href !== "/dashboard" && pathname.startsWith(href))) &&
                        "bg-ink text-white hover:bg-ink",
                    )}
                  >
                    <Icon className="shrink-0" size={18} strokeWidth={1.8} />
                    <span className={collapsed ? "lg:hidden" : ""}>{label}</span>
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      if (collapsed) setCollapsed(false);
                      if (items) setExpanded(collapsed ? label : open ? "" : label);
                    }}
                    title={collapsed ? label : undefined}
                    className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[12px] font-semibold transition hover:bg-mist", collapsed && "lg:justify-center lg:px-2", currentGroup === label && "text-blue-700")}
                  >
                    <Icon className="shrink-0" size={18} strokeWidth={1.8} />
                    <span className={collapsed ? "lg:hidden" : ""}>{label}</span>
                    {items && (
                      <ChevronDown
                        size={12}
                        className={cn(
                          "ml-auto transition-transform",
                          collapsed && "lg:hidden",
                          open && "rotate-180",
                        )}
                      />
                    )}
                  </button>
                )}
                {items && open && (
                  <div className={cn("ml-5 border-l border-line py-1 pl-4", collapsed && "lg:hidden")}>
                    {items.map((sub) => (
                      <Link
                        href={sub.href}
                        key={sub.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "block rounded-lg px-2 py-2.5 text-[11px] text-muted hover:bg-mist hover:text-ink",
                          pathname.startsWith(sub.href) && "bg-blue-50 font-bold text-blue-700",
                        )}
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <p className={cn("eyebrow mb-2 mt-7 px-2 text-muted", collapsed && "lg:hidden")}>Workspace</p>
          <Link
            href="/dashboard/security"
            onClick={() => setMobileOpen(false)}
            title={collapsed ? "Security" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-3 text-[12px] font-semibold hover:bg-mist",
              collapsed && "lg:justify-center lg:px-2",
              pathname.startsWith("/dashboard/security") && "bg-ink text-white hover:bg-ink",
            )}
          >
            <ShieldCheck className="shrink-0" size={18} />
            <span className={collapsed ? "lg:hidden" : ""}>Security</span>
          </Link>
          {(userRole === "preview" || hasPermission(effectiveRole, "organization.manage")) && <Link
            href="/dashboard/administration"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-3 text-[12px] font-semibold hover:bg-mist",
              collapsed && "lg:justify-center lg:px-2",
              pathname.startsWith("/dashboard/administration") &&
                "bg-ink text-white hover:bg-ink",
            )}
          >
            <Settings className="shrink-0" size={18} />
            <span className={collapsed ? "lg:hidden" : ""}>Administration</span>
          </Link>}
        </nav>
        <form action={logoutAction} className={cn("absolute inset-x-3 bottom-3", collapsed && "lg:inset-x-2")}>
          <button title={collapsed ? `Sign out ${userName}` : undefined} className={cn("flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-[11px] text-muted hover:bg-mist", collapsed && "lg:justify-center lg:px-2")}>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-100 font-bold text-blue-800">
              {userName.slice(0, 2).toUpperCase()}
            </span>
            <span className={cn("min-w-0 flex-1 text-left", collapsed && "lg:hidden")}>
              <span className="block truncate font-semibold text-ink">
                {userName}
              </span>
              <span className="block truncate font-mono text-[8px] uppercase text-muted">
                {userRole.replaceAll("_", " ")}
              </span>
            </span>
            <LogOut size={14} className={collapsed ? "lg:hidden" : ""} />
          </button>
        </form>
      </aside>
      <div className={cn("transition-[padding] duration-300 lg:pl-[268px]", collapsed && "lg:pl-[76px]")}>
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur-xl sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="grid size-9 place-items-center rounded-lg border border-line lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu size={17} />
          </button>
          <div className="hidden h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-line bg-[#f8f9f5] px-3 text-[11px] text-muted sm:flex">
            <Search size={14} /> Search SKU, PO, supplier or location{" "}
            <span className="ml-auto flex items-center gap-0.5 rounded border border-line bg-white px-1.5 py-0.5 font-mono text-[8px]">
              <Command size={9} />K
            </span>
          </div>
          {preview && (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 font-mono text-[8px] font-medium text-amber-800">
              DEMO DATA
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {canManageOperationalModule("products", effectiveRole) && <Link href={modulePaths.products + "?create=1"} className="hidden h-9 items-center gap-2 rounded-lg bg-ink px-3 text-[11px] font-bold text-white sm:flex">
              <Plus size={14} />
              Quick create
            </Link>}
            <Link href="/dashboard" aria-label="Open attention queue" className="relative grid size-9 place-items-center rounded-lg border border-line bg-white">
              <Bell size={15} />
              <i className="absolute right-2 top-2 size-1.5 rounded-full bg-red-500" />
            </Link>
            <Link href="/dashboard/administration#warehouses" className="hidden h-9 items-center gap-2 rounded-lg border border-line px-3 text-[11px] font-semibold md:flex">
              <Building2 size={14} />
              Warehouses
              <ArrowRight size={11} />
            </Link>
          </div>
        </header>
        <main>{children}</main>
      </div>
      {mobileOpen && (
        <button
          className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close sidebar overlay"
        />
      )}
    </div>
  );
}
