import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  PackageCheck,
  ShoppingCart,
  Sparkles,
  Truck,
} from "lucide-react";
import { BusinessCharts } from "@/components/operations/dashboard-charts";
import { RealtimeDashboardSync } from "@/components/operations/realtime-dashboard-sync";
import { ScrollReveal } from "@/components/motion/scroll-motion";
import type { DashboardData, DashboardMetric } from "@/lib/operations/dashboard-data";

const metricIcons = { products: PackageCheck, stock: CheckCircle2, orders: ShoppingCart, inbound: Truck } as const;

export function DashboardContent({ userName, data, realtime, organizationId }: { userName: string; data: DashboardData; realtime: boolean; organizationId?: string }) {
  const health = data.inventoryHealth;
  const healthTotal = health.healthy + health.low + health.critical + health.inactive;
  const healthRows = [
    ["Healthy", health.healthy, "bg-blue-600"],
    ["Low stock", health.low, "bg-amber-400"],
    ["Critical", health.critical, "bg-red-500"],
    ["Inactive", health.inactive, "bg-slate-300"],
  ] as const;

  return (
    <div className="min-w-0 w-full p-3 min-[380px]:p-4 sm:p-6 lg:p-8 xl:p-10">
      <ScrollReveal distance={14}>
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-blue-700"><Sparkles size={14} /> OPERATIONS INTELLIGENCE</div>
            <h1 className="mt-3 break-words text-2xl font-bold tracking-[-.05em] sm:text-4xl">Good morning, {userName}.</h1>
            <p className="mt-2 text-sm text-muted">Live visibility across your inventory, procurement, and warehouse network.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[9px] text-muted">Updated {formatTime(data.generatedAt)}</span>
            {realtime && organizationId ? <RealtimeDashboardSync organizationId={organizationId} /> : <span className="rounded-full bg-slate-100 px-3 py-1.5 font-mono text-[9px] text-muted">OFFLINE</span>}
          </div>
        </header>
      </ScrollReveal>

      {data.setupError && <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"><CircleAlert className="mt-0.5 shrink-0" size={15} />{data.setupError}</div>}

      <ScrollReveal className="mt-8" distance={16}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
        </div>
      </ScrollReveal>

      <ScrollReveal className="mt-5" distance={18} delay={0.04}><BusinessCharts data={data} /></ScrollReveal>

      <ScrollReveal className="mt-5" distance={18}>
        <div className="grid gap-5 xl:grid-cols-[1.18fr_.82fr]">
          <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_14px_45px_rgba(25,72,133,.055)]">
            <SectionHeading title="Attention queue" description="Live exceptions ranked by operational impact" action={<span className="rounded-full bg-red-50 px-3 py-1.5 font-mono text-[9px] font-medium text-red-700">{data.alerts.length} OPEN</span>} />
            {data.alerts.length ? data.alerts.map((alert) => {
              const tone = alert.level === "Critical" ? "bg-red-50 text-red-700 ring-red-100" : alert.level === "Delayed" ? "bg-amber-50 text-amber-800 ring-amber-100" : "bg-blue-50 text-blue-700 ring-blue-100";
              return <div key={`${alert.level}-${alert.title}`} className="grid gap-4 border-b border-line px-5 py-5 transition last:border-0 hover:bg-[#f8faff] sm:grid-cols-[auto_1fr_auto] sm:items-center"><span className={`w-fit rounded-full px-2.5 py-1.5 font-mono text-[8px] font-medium ring-1 ${tone}`}>{alert.level.toUpperCase()}</span><div><h3 className="text-sm font-bold">{alert.title}</h3><p className="mt-1 text-[10px] text-muted">{alert.meta}</p></div><Link href={alert.href} className="flex items-center gap-2 rounded-lg px-2 py-2 text-[10px] font-bold text-blue-700 transition hover:bg-blue-50">{alert.action}<ArrowRight size={13} /></Link></div>;
            }) : <EmptyState text="No operational exceptions require attention." />}
          </section>

          <section className="rounded-2xl border border-line bg-white shadow-[0_14px_45px_rgba(25,72,133,.055)]">
            <SectionHeading title="Inventory health" description="Live SKUs by stocking policy" action={<AlertTriangle size={18} className="text-amber-600" />} />
            <div className="p-6">
              <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">{healthRows.map(([label, value, tone]) => <span key={label} style={{ width: `${healthTotal ? (value / healthTotal) * 100 : 0}%` }} className={tone} />)}</div>
              <div className="mt-6 grid gap-4 min-[400px]:grid-cols-2">{healthRows.map(([label, value, tone]) => <div key={label} className="rounded-xl border border-line p-3"><div className="flex items-center gap-2"><span className={`size-2.5 rounded-full ${tone}`} /><span className="text-[10px] font-semibold text-muted">{label}</span><span className="ml-auto font-mono text-[9px] text-muted">{healthTotal ? Math.round((value / healthTotal) * 100) : 0}%</span></div><strong className="mt-2 block text-lg">{value.toLocaleString()}</strong></div>)}</div>
              <Link href="/dashboard/inventory/stock" className="mt-5 flex w-full items-center justify-between rounded-xl bg-blue-50 px-4 py-3 text-[10px] font-bold text-blue-700 transition hover:bg-blue-100">Open stock overview <ArrowUpRight size={14} /></Link>
            </div>
          </section>
        </div>
      </ScrollReveal>

      <ScrollReveal className="mt-5" distance={18}>
        <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_14px_45px_rgba(25,72,133,.055)]">
          <SectionHeading title="Inbound purchase orders" description="Open orders and expected delivery dates" action={<Link href="/dashboard/procurement/purchase-orders" className="flex items-center gap-2 text-[10px] font-bold text-blue-700">View all <ArrowRight size={13} /></Link>} />
          {data.inbound.length ? <><div className="divide-y divide-line md:hidden">{data.inbound.map((row) => <article key={row.reference} className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-mono text-[10px] font-medium text-blue-700">{row.reference}</p><h3 className="mt-1 break-words text-sm font-bold">{row.title}</h3></div><Status status={row.status} /></div><div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-mist p-3 text-[10px]"><div><p className="text-muted">Expected</p><p className="mt-1 flex items-center gap-1.5 font-semibold"><Clock3 size={13} />{row.expected}</p></div><div><p className="text-muted">Value</p><p className="mt-1 font-mono font-semibold">{row.value}</p></div></div></article>)}</div><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b border-line bg-[#f8faff] font-mono text-[8px] uppercase tracking-wider text-muted"><th className="px-6 py-4 font-medium">Purchase order</th><th className="px-6 py-4 font-medium">Supplier / purpose</th><th className="px-6 py-4 font-medium">Expected</th><th className="px-6 py-4 font-medium">Value</th><th className="px-6 py-4 font-medium">Status</th></tr></thead><tbody>{data.inbound.map((row) => <tr key={row.reference} className="border-b border-line text-[11px] transition last:border-0 hover:bg-[#f8faff]"><td className="px-6 py-5 font-mono font-medium text-blue-700">{row.reference}</td><td className="px-6 py-5 font-semibold">{row.title}</td><td className="px-6 py-5 text-muted"><span className="flex items-center gap-2"><Clock3 size={14} />{row.expected}</span></td><td className="px-6 py-5 font-mono">{row.value}</td><td className="px-6 py-5"><Status status={row.status} /></td></tr>)}</tbody></table></div></> : <EmptyState text="No open purchase orders are scheduled for delivery." />}
        </section>
      </ScrollReveal>

      <ScrollReveal className="mt-5" distance={18}>
        <div className="grid gap-5 md:grid-cols-2">
          <section className="rounded-2xl border border-line bg-white p-6 shadow-[0_14px_45px_rgba(25,72,133,.055)]">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-bold">Recent movements</h2><p className="mt-1 text-[10px] text-muted">Latest immutable ledger activity</p></div><Link href="/dashboard/inventory/movements" className="text-[10px] font-bold text-blue-700">Open ledger</Link></div>
            <div className="mt-5">{data.recentMovements.length ? data.recentMovements.map((movement) => { const incoming = movement.quantity > 0; return <div key={`${movement.reference}-${movement.type}`} className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 border-t border-line py-4 first:border-0"><span className={`grid size-10 place-items-center rounded-xl ${incoming ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{incoming ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}</span><div className="min-w-0"><p className="truncate text-[11px] font-semibold">{humanize(movement.type)}</p><p className="mt-1 truncate font-mono text-[9px] text-muted">{movement.reference}</p></div><span className="font-mono text-[11px] font-medium">{movement.quantity > 0 ? "+" : ""}{formatQuantity(movement.quantity)}</span></div>; }) : <EmptyState text="No stock movements have been posted yet." compact />}</div>
          </section>
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-blue-800 to-[#0b1f3a] p-7 text-white shadow-[0_22px_60px_rgba(29,78,216,.2)]">
            <div className="absolute -right-16 -top-16 size-48 rounded-full border-[28px] border-white/5" aria-hidden="true" />
            <p className="font-mono text-[9px] uppercase tracking-[.14em] text-blue-200">Workflow pulse</p><h2 className="mt-4 text-2xl font-bold tracking-[-.04em]">{data.approvals.total} approvals are waiting.</h2><p className="mt-3 max-w-md text-sm leading-6 text-blue-100/70">{data.approvals.requisitions} requisitions and {data.approvals.purchaseOrders} purchase orders are submitted for review.</p>
            <div className="mt-8 flex items-center gap-2">{Array.from({ length: Math.max(8, data.approvals.total) }, (_, index) => <span key={index} className={`h-2 flex-1 rounded-full transition hover:scale-y-150 ${index < data.approvals.total ? "bg-blue-300" : "bg-white/15"}`} />)}</div>
            <Link href="/dashboard/procurement/requisitions" className="mt-7 flex w-full items-center justify-between rounded-xl bg-white px-4 py-3.5 text-[11px] font-bold text-blue-800 transition hover:bg-blue-50">Review approval queue <ArrowRight size={14} /></Link>
          </section>
        </div>
      </ScrollReveal>
    </div>
  );
}

function MetricCard({ metric }: { metric: DashboardMetric }) {
  const Icon = metricIcons[metric.kind];
  const trendTone = metric.trendTone === "positive" ? "bg-emerald-50 text-emerald-700" : metric.trendTone === "attention" ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-700";
  return <article className="group rounded-2xl border border-line bg-white p-5 shadow-[0_14px_40px_rgba(25,72,133,.055)] transition duration-300 hover:-translate-y-1 hover:border-blue-200"><div className="flex items-start justify-between"><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white"><Icon size={18} /></span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${trendTone}`}>{metric.trend}</span></div><p className="mt-5 text-[11px] font-semibold text-muted">{metric.label}</p><div className="mt-1 flex items-end justify-between gap-4"><strong className="text-3xl tracking-[-.05em]">{metric.value}</strong><div className="flex h-9 items-end gap-1" aria-hidden="true">{metric.bars.map((bar, index) => <span key={index} style={{ height: `${bar}%` }} className="w-1.5 rounded-full bg-blue-200 transition group-hover:bg-blue-500" />)}</div></div><p className="mt-2 text-[10px] text-muted">{metric.detail}</p></article>;
}

function SectionHeading({ title, description, action }: { title: string; description: string; action: React.ReactNode }) { return <div className="flex flex-col items-start justify-between gap-3 border-b border-line px-4 py-4 min-[420px]:flex-row min-[420px]:items-center sm:px-6 sm:py-5"><div className="min-w-0"><h2 className="text-base font-bold">{title}</h2><p className="mt-1 text-[10px] text-muted">{description}</p></div><div className="shrink-0">{action}</div></div>; }
function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) { return <div className={`${compact ? "py-8" : "py-14"} px-6 text-center text-[10px] text-muted`}><CheckCircle2 className="mx-auto mb-3 text-blue-300" size={20} />{text}</div>; }
function Status({ status }: { status: string }) { return <span className="rounded-full bg-blue-50 px-2.5 py-1.5 font-mono text-[8px] text-blue-700">{humanize(status).toUpperCase()}</span>; }
function humanize(value: string) { return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }
function formatTime(value: string) { return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value)); }
function formatQuantity(value: number) { return new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(value); }
