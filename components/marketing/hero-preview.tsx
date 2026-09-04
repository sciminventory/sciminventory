"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Box,
  ChevronDown,
  CircleAlert,
  Command,
  PackageCheck,
  Search,
  Warehouse,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

const tabs = ["Control tower", "Inbound", "Inventory"];
const movements = [
  {
    icon: ArrowDownLeft,
    title: "Goods receipt",
    ref: "GRN-1034 · Apex Industrial",
    value: "+500",
    tone: "text-blue-700 bg-blue-50",
  },
  {
    icon: ArrowUpRight,
    title: "Transfer dispatched",
    ref: "TR-2041 · Central → North",
    value: "−100",
    tone: "text-blue-700 bg-blue-50",
  },
  {
    icon: PackageCheck,
    title: "Putaway confirmed",
    ref: "PUT-0872 · Zone A / Bin 03",
    value: "+72",
    tone: "text-violet-700 bg-violet-50",
  },
];

export function HeroPreview() {
  const [active, setActive] = useState(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto mt-12 w-full max-w-[1110px] sm:mt-16"
    >
      <div className="absolute -inset-8 -z-10 rounded-[44px] bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,.30),transparent_58%)] blur-2xl" />
      <div className="overflow-hidden rounded-[22px] border border-ink/15 bg-[#f7faff] shadow-[0_30px_90px_rgba(11,31,58,.16)]">
        <div className="flex h-12 items-center justify-between border-b border-line bg-white px-4">
          <div className="flex items-center gap-4">
            <BrandMark compact />
            <div className="hidden h-7 w-44 items-center gap-2 rounded-lg bg-mist px-3 text-[10px] text-muted sm:flex">
              <Search size={12} /> Search operations{" "}
              <span className="ml-auto flex items-center">
                <Command size={9} />K
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-semibold">
            <span className="size-2 rounded-full bg-accent shadow-[0_0_0_3px_rgba(37,99,235,.20)]" />{" "}
            <span className="hidden min-[390px]:inline">All systems synced</span>{" "}
            <span className="ml-1 grid size-7 place-items-center rounded-full bg-ink text-[9px] text-white">
              MS
            </span>
          </div>
        </div>
        <div className="grid min-h-[510px] grid-cols-1 md:grid-cols-[170px_1fr]">
          <aside className="hidden border-r border-line bg-white p-3 md:block">
            <div className="eyebrow mb-3 px-2 text-muted">Workspace</div>
            {[
              "Overview",
              "Inventory",
              "Warehouse",
              "Procurement",
              "Suppliers",
              "Logistics",
            ].map((item, index) => (
              <div
                key={item}
                className={cn(
                  "mb-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-semibold",
                  index === 0 ? "bg-ink text-white" : "text-muted",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    index === 0 ? "bg-accent" : "bg-line",
                  )}
                />
                {item}
              </div>
            ))}
            <div className="mt-16 rounded-xl bg-mist p-3">
              <div className="eyebrow text-muted">Warehouse</div>
              <div className="mt-2 flex items-center gap-2 text-[10px] font-bold">
                <Warehouse size={13} /> Manila Central
              </div>
            </div>
          </aside>
          <div className="min-w-0 p-3 min-[380px]:p-4 sm:p-6 lg:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="eyebrow text-muted">Friday · 04 September</div>
                <h2 className="mt-2 text-xl font-bold tracking-[-.04em] sm:text-2xl">
                  Good morning, Maria.
                </h2>
                <p className="mt-1 text-[11px] text-muted">
                  Here’s what needs your attention today.
                </p>
              </div>
              <button className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-[10px] font-semibold">
                All warehouses <ChevronDown size={12} />
              </button>
            </div>
            <div className="mt-6 flex gap-5 border-b border-line text-[11px] font-semibold">
              {tabs.map((tab, index) => (
                <button
                  key={tab}
                  onClick={() => setActive(index)}
                  className={cn(
                    "relative pb-3 text-muted transition-colors",
                    active === index && "text-ink",
                  )}
                >
                  {tab}
                  {active === index && (
                    <motion.span
                      layoutId="hero-tab"
                      className="absolute inset-x-0 bottom-0 h-0.5 bg-ink"
                    />
                  )}
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.22 }}
              >
                <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
                  {[
                    { k: "Inventory value", v: "$2.48M", d: "Across 3 sites" },
                    { k: "Available units", v: "48,290", d: "92.4% healthy" },
                    { k: "Inbound", v: "1,840", d: "6 shipments" },
                    { k: "Needs action", v: "12", d: "3 critical" },
                  ].map((metric, index) => (
                    <div
                      key={metric.k}
                      className={cn(
                        "rounded-xl border p-3 sm:p-4",
                        index === 3
                          ? "border-amber-200 bg-amber-50"
                          : "border-line bg-white",
                      )}
                    >
                      <div className="text-[9px] font-semibold text-muted">
                        {metric.k}
                      </div>
                      <div className="mt-2 text-lg font-bold tracking-[-.04em] sm:text-xl">
                        {metric.v}
                      </div>
                      <div className="mt-1 text-[9px] text-muted">
                        {metric.d}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-[1.25fr_.75fr]">
                  <div className="rounded-xl border border-line bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold">Inventory flow</h3>
                        <p className="mt-1 text-[9px] text-muted">
                          Units moved · last 7 days
                        </p>
                      </div>
                      <span className="eyebrow text-blue-700">+8.4%</span>
                    </div>
                    <div className="mt-5 flex h-28 items-end gap-2 border-b border-line px-1">
                      {[42, 62, 48, 78, 55, 92, 70, 88, 60, 100, 72, 84].map(
                        (height, index) => (
                          <motion.div
                            key={index}
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{ delay: index * 0.025 }}
                            className={cn(
                              "flex-1 rounded-t-[3px]",
                              index === 9 ? "bg-accent" : "bg-ink/12",
                            )}
                          />
                        ),
                      )}
                    </div>
                    <div className="mt-2 flex justify-between font-mono text-[8px] text-muted">
                      <span>29 AUG</span>
                      <span>04 SEP</span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-line bg-ink p-4 text-white">
                    <div className="flex items-center gap-2">
                      <CircleAlert className="text-accent" size={14} />
                      <h3 className="text-xs font-bold">Attention queue</h3>
                      <span className="ml-auto rounded-full bg-white/10 px-2 py-1 font-mono text-[8px]">
                        12 open
                      </span>
                    </div>
                    <div className="mt-4 space-y-2">
                      {[
                        "3 items below safety stock",
                        "2 receipts past due",
                        "7 approvals waiting",
                      ].map((item, index) => (
                        <div
                          key={item}
                          className="flex items-center gap-2 rounded-lg bg-white/[.06] p-2.5 text-[9px]"
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              index === 0 ? "bg-amber-400" : "bg-accent",
                            )}
                          />
                          {item}
                          <ArrowUpRight
                            size={10}
                            className="ml-auto opacity-50"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-3 rounded-xl border border-line bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-bold">Recent stock movement</h3>
                    <button className="text-[9px] font-bold underline underline-offset-4">
                      View ledger
                    </button>
                  </div>
                  {movements.map(({ icon: Icon, title, ref, value, tone }) => (
                    <div
                      key={ref}
                      className="grid grid-cols-[28px_1fr_auto] items-center gap-3 border-t border-line py-2.5 first:border-0"
                    >
                      <span
                        className={cn(
                          "grid size-7 place-items-center rounded-lg",
                          tone,
                        )}
                      >
                        <Icon size={12} />
                      </span>
                      <div>
                        <div className="text-[10px] font-semibold">{title}</div>
                        <div className="mt-0.5 truncate text-[8px] text-muted">
                          {ref}
                        </div>
                      </div>
                      <div className="font-mono text-[10px] font-medium">
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
      <div className="absolute -right-3 top-32 hidden rounded-xl border border-white/70 bg-white/90 p-3 shadow-xl backdrop-blur lg:block">
        <Box size={15} />
        <div className="mt-5 font-mono text-[9px] text-muted">LIVE STOCK</div>
        <div className="mt-1 text-lg font-bold">48,290</div>
      </div>
    </motion.div>
  );
}
