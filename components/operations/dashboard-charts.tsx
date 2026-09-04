"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import type { DashboardData } from "@/lib/operations/dashboard-data";

type Range = keyof DashboardData["throughput"];

export function BusinessCharts({ data }: { data: DashboardData }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.45fr_.75fr]">
      <InventoryTrendChart throughput={data.throughput} total={data.throughputTotal} trend={data.throughputTrend} />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
        <ServiceLevelChart service={data.service} />
        <ProcurementSpendChart spend={data.spend} />
      </div>
    </div>
  );
}

function InventoryTrendChart({ throughput, total, trend }: { throughput: DashboardData["throughput"]; total: number; trend: number }) {
  const [range, setRange] = useState<Range>("30D");
  const [hovered, setHovered] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();
  const data = throughput[range];
  const width = 760;
  const height = 272;
  const paddingX = 26;
  const paddingY = 24;
  const maxValue = Math.max(...data, 1);
  const points = useMemo(
    () =>
      data.map((value, index) => ({
        x: paddingX + (index / (data.length - 1)) * (width - paddingX * 2),
        y: height - paddingY - (value / maxValue) * (height - paddingY * 2),
        value,
      })),
    [data, maxValue],
  );
  const line = points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
  const area = `${line} L${points.at(-1)?.x},${height - paddingY} L${points[0]?.x},${height - paddingY} Z`;
  const selected = points[hovered ?? points.length - 1];

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_18px_55px_rgba(25,72,133,.07)]">
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 pb-2 pt-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-accent"><TrendingUp size={17} /></span>
            <div><h2 className="text-base font-bold">Inventory throughput</h2><p className="mt-0.5 text-[11px] text-muted">Units processed across the network</p></div>
          </div>
          <div className="mt-6 flex items-end gap-3">
            <strong className="text-3xl tracking-[-.05em]">{formatCompact(total)}</strong>
            <span className={`mb-1 rounded-full px-2 py-1 text-[10px] font-bold ${trend >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{trend >= 0 ? "+" : ""}{trend.toFixed(1)}%</span>
          </div>
        </div>
        <div className="flex rounded-xl border border-line bg-[#f7faff] p-1">
          {(Object.keys(throughput) as Range[]).map((item) => (
            <button key={item} onClick={() => { setRange(item); setHovered(null); }} className={`rounded-lg px-3 py-2 font-mono text-[9px] font-medium transition ${range === item ? "bg-white text-accent shadow-sm" : "text-muted hover:text-ink"}`}>{item}</button>
          ))}
        </div>
      </div>
      <div className="relative px-3 pb-4 sm:px-5">
        <div className="pointer-events-none absolute left-7 top-3 z-10 rounded-xl border border-blue-100 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
          <p className="font-mono text-[8px] uppercase text-muted">Throughput index</p>
          <p className="mt-1 text-sm font-bold text-blue-700">{formatCompact(selected?.value ?? 0)}</p>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[272px] w-full" role="img" aria-label={`Inventory throughput chart for ${range}`} onMouseLeave={() => setHovered(null)}>
          <defs>
            <linearGradient id="inventory-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity=".24" /><stop offset="100%" stopColor="#2563eb" stopOpacity="0" /></linearGradient>
            <filter id="line-glow"><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          {[0, 1, 2, 3].map((lineIndex) => <line key={lineIndex} x1="26" x2="734" y1={34 + lineIndex * 58} y2={34 + lineIndex * 58} stroke="#dbe7f5" strokeDasharray="4 7" />)}
          <motion.path key={`area-${range}`} d={area} fill="url(#inventory-area)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduceMotion ? 0 : .6 }} />
          <motion.path key={`line-${range}`} d={line} fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" filter="url(#line-glow)" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] }} />
          {points.map((point, index) => (
            <g key={index} onMouseEnter={() => setHovered(index)} className="cursor-crosshair">
              <rect x={point.x - width / points.length / 2} y="0" width={width / points.length} height={height} fill="transparent" />
              {(hovered === index || (hovered === null && index === points.length - 1)) && <><line x1={point.x} x2={point.x} y1="18" y2={height - paddingY} stroke="#93b4ee" strokeDasharray="3 5" /><motion.circle initial={{ r: 0 }} animate={{ r: 6 }} cx={point.x} cy={point.y} fill="white" stroke="#2563eb" strokeWidth="4" /></>}
            </g>
          ))}
        </svg>
        <div className="flex justify-between px-4 font-mono text-[9px] uppercase text-muted"><span>{range === "7D" ? "Mon" : "Period start"}</span><span>Midpoint</span><span>Today</span></div>
      </div>
    </section>
  );
}

function ServiceLevelChart({ service }: { service: DashboardData["service"] }) {
  const reduceMotion = useReducedMotion();
  const circumference = 2 * Math.PI * 42;
  const offset = circumference * (1 - Math.min(100, Math.max(0, service.rate)) / 100);
  return (
    <section className="rounded-2xl border border-line bg-gradient-to-br from-[#0b1f3a] to-[#123a72] p-6 text-white shadow-[0_18px_55px_rgba(11,31,58,.16)]">
      <div className="flex items-start justify-between"><div><p className="font-mono text-[9px] uppercase tracking-[.12em] text-blue-200">Service level</p><h2 className="mt-2 text-base font-bold">Orders fulfilled</h2></div><ArrowUpRight size={17} className="text-blue-200" /></div>
      <div className="mt-5 flex items-center gap-5">
        <div className="relative size-32 shrink-0">
          <svg viewBox="0 0 100 100" className="-rotate-90"><circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="8" /><motion.circle cx="50" cy="50" r="42" fill="none" stroke="#78a8ff" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} whileInView={{ strokeDashoffset: offset }} viewport={{ once: false }} transition={{ duration: reduceMotion ? 0 : 1.2, ease: [0.22, 1, 0.36, 1] }} /></svg>
          <div className="absolute inset-0 grid place-items-center text-center"><div><strong className="text-2xl">{service.rate.toFixed(1)}%</strong><p className="mt-1 text-[9px] text-blue-200">OTIF</p></div></div>
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          {[['On time', service.onTime], ['Late', service.late], ['Exceptions', service.exceptions]].map(([label, value]) => <div key={label} className="flex items-center justify-between border-b border-white/10 pb-2"><span className="text-[10px] text-blue-100/70">{label}</span><strong className="font-mono text-[10px]">{value}</strong></div>)}
        </div>
      </div>
    </section>
  );
}

function ProcurementSpendChart({ spend }: { spend: DashboardData["spend"] }) {
  const reduceMotion = useReducedMotion();
  const maxAmount = Math.max(...spend.map((row) => row.amount), 1);
  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-[0_18px_55px_rgba(25,72,133,.07)]">
      <div className="flex items-start justify-between"><div><p className="font-mono text-[9px] uppercase tracking-[.12em] text-muted">Committed spend</p><h2 className="mt-2 text-base font-bold">By category</h2></div><span className="rounded-lg bg-blue-50 px-2 py-1 font-mono text-[9px] text-blue-700">SEP</span></div>
      <div className="mt-5 space-y-4">
        {spend.map((row, index) => <div key={row.label}><div className="mb-2 flex justify-between text-[10px]"><span className="font-semibold">{row.label}</span><span className="font-mono text-muted">{formatCurrency(row.amount)}</span></div><div className="h-2 overflow-hidden rounded-full bg-blue-50"><motion.div className="h-full rounded-full bg-gradient-to-r from-blue-700 to-blue-400" initial={{ width: 0 }} whileInView={{ width: `${row.amount === 0 ? 0 : Math.max(8, (row.amount / maxAmount) * 100)}%` }} viewport={{ once: false }} transition={{ duration: reduceMotion ? 0 : .8, delay: index * .12, ease: [0.22, 1, 0.36, 1] }} /></div></div>)}
      </div>
    </section>
  );
}

function formatCompact(value: number) { return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value); }
function formatCurrency(value: number) { return new Intl.NumberFormat("en", { style: "currency", currency: "USD", notation: value >= 100_000 ? "compact" : "standard", maximumFractionDigits: value >= 100_000 ? 1 : 0 }).format(value); }
