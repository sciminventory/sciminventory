"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Boxes, Building2, Gauge, LayoutDashboard, LogOut, Menu, ReceiptText, ShoppingCart, Truck, X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

const nav = [
  { label: "Overview", href: "/vendor", icon: LayoutDashboard },
  { label: "Company profile", href: "/vendor/profile", icon: Building2 },
  { label: "Catalog", href: "/vendor/catalog", icon: Boxes },
  { label: "Purchase orders", href: "/vendor/orders", icon: ShoppingCart },
  { label: "Shipments", href: "/vendor/shipments", icon: Truck },
  { label: "Invoices & payments", href: "/vendor/invoices", icon: ReceiptText },
  { label: "Performance", href: "/vendor/performance", icon: Gauge },
] as const;

export function VendorPortalShell({ children, vendorName, userName, unread, logoutAction }: { children: React.ReactNode; vendorName: string; userName: string; unread: number; logoutAction: () => Promise<void> }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <div className="min-h-screen bg-[#f4f7fb] text-ink"><aside className={`fixed inset-y-0 left-0 z-50 w-[min(280px,calc(100vw-20px))] border-r border-line bg-white transition-transform duration-300 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}><div className="flex h-[72px] items-center justify-center border-b border-line"><BrandMark iconOnly /><button onClick={() => setOpen(false)} aria-label="Close navigation" className="absolute right-5 lg:hidden"><X size={18} /></button></div><div className="border-b border-line p-4"><p className="text-xs uppercase tracking-wider text-blue-700">Vendor portal</p><h2 className="mt-1 truncate font-bold">{vendorName}</h2></div><nav className="h-[calc(100dvh-205px)] overflow-y-auto p-3">{nav.map(({ label, href, icon: Icon }) => { const active = href === "/vendor" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} onClick={() => setOpen(false)} className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${active ? "bg-ink text-white" : "text-muted hover:bg-mist hover:text-ink"}`}><Icon size={18} />{label}</Link>; })}</nav><form action={logoutAction} className="absolute inset-x-3 bottom-3"><button className="flex w-full items-center gap-3 rounded-xl border border-line p-3 text-sm"><span className="grid size-8 place-items-center rounded-full bg-blue-100 font-bold text-blue-800">{userName.slice(0,2).toUpperCase()}</span><span className="min-w-0 flex-1 truncate text-left">{userName}</span><LogOut size={15} /></button></form></aside><div className="min-w-0 lg:pl-[280px]"><header className="sticky top-0 z-30 flex h-[72px] items-center border-b border-line bg-white/90 px-4 backdrop-blur-xl sm:px-6"><button onClick={() => setOpen(true)} aria-label="Open navigation" className="grid size-10 place-items-center rounded-xl border border-line lg:hidden"><Menu size={18} /></button><div className="ml-3 lg:ml-0"><p className="text-xs font-bold text-blue-700">Secure partner workspace</p><p className="hidden text-xs text-muted sm:block">Orders, deliveries, documents and payments</p></div><Link href="/vendor" className="relative ml-auto grid size-10 place-items-center rounded-xl border border-line"><Bell size={17} />{unread > 0 && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white">{Math.min(unread, 9)}</span>}</Link></header><main>{children}</main></div>{open && <button aria-label="Close navigation overlay" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-ink/30 lg:hidden" />}</div>;
}
