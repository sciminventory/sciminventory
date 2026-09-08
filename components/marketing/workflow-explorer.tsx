"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, PackageOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const stages = [
  {
    name: "Plan",
    label: "Requirement PR-0452",
    title: "Restock safety inventory",
    meta: "12 line items · Operations",
    progress: 18,
    action: "Review requirement",
  },
  {
    name: "Source",
    label: "RFQ-2026-0088",
    title: "Compare qualified suppliers",
    meta: "4 responses · closes today",
    progress: 32,
    action: "Compare quotes",
  },
  {
    name: "Purchase",
    label: "PO-2026-0941",
    title: "Apex Industrial Supply",
    meta: "₱28,640 · confirmed",
    progress: 48,
    action: "Open purchase order",
  },
  {
    name: "Receive",
    label: "PO-2026-0941",
    title: "Inbound at Dock 02",
    meta: "320 received · 130 pending",
    progress: 64,
    action: "Record receipt",
  },
  {
    name: "Store",
    label: "PUT-2026-0872",
    title: "Putaway in progress",
    meta: "ZONE-A · 3 locations",
    progress: 76,
    action: "View putaway tasks",
  },
  {
    name: "Move",
    label: "TR-2026-2041",
    title: "Central → North Hub",
    meta: "100 units · in transit",
    progress: 84,
    action: "Track transfer",
  },
  {
    name: "Dispatch",
    label: "PICK-2026-1184",
    title: "Wave 14 ready to pack",
    meta: "8 orders · 42 units",
    progress: 92,
    action: "Open dispatch",
  },
  {
    name: "Analyze",
    label: "CONTROL TOWER",
    title: "Network inventory health",
    meta: "92.4% healthy · 12 alerts",
    progress: 100,
    action: "View insights",
  },
] as const;

export function WorkflowExplorer() {
  const [active, setActive] = useState(3);
  const stage = stages[active];

  return (
    <div className="mt-12 overflow-hidden rounded-[28px] border border-white/10 bg-[#081a33] text-white shadow-2xl">
      <div className="hide-scrollbar flex overflow-x-auto border-b border-white/10 px-5 lg:px-8">
        {stages.map((item, index) => (
          <button
            key={item.name}
            onClick={() => setActive(index)}
            className={cn(
              "relative min-w-max px-4 py-5 text-sm font-semibold text-white/45 transition-colors hover:text-white lg:flex-1",
              active === index && "text-white",
            )}
          >
            {item.name}
            {active === index && (
              <motion.span
                layoutId="workflow-tab"
                className="absolute inset-x-3 bottom-0 h-0.5 bg-accent"
              />
            )}
          </button>
        ))}
      </div>
      <div className="grid items-stretch lg:grid-cols-[.8fr_1.2fr]">
        <div className="flex flex-col justify-center p-7 lg:p-12">
          <div className="eyebrow text-accent">
            {String(active + 1).padStart(2, "0")} /{" "}
            {String(stages.length).padStart(2, "0")} · {stage.name}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={stage.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <h3 className="mt-5 text-3xl font-bold tracking-[-.05em] lg:text-4xl">
                Every handoff stays visible.
              </h3>
              <p className="mt-5 max-w-md text-base leading-7 text-white/60">
                Move work forward without losing the commercial, physical, or
                audit context behind it. Each stage keeps its source, owner,
                status, and next action attached.
              </p>
            </motion.div>
          </AnimatePresence>
          <div className="mt-8 flex items-center gap-2">
            {stages.map((_, index) => (
              <button
                key={index}
                aria-label={`Show ${stages[index].name}`}
                onClick={() => setActive(index)}
                className={cn(
                  "h-1 rounded-full bg-white/15 transition-all",
                  active === index ? "w-8 bg-accent" : "w-3",
                )}
              />
            ))}
          </div>
        </div>
        <div className="relative min-h-[390px] overflow-hidden bg-[#eef4ff] p-5 text-ink sm:p-9 lg:p-12">
          <div className="grid-fade absolute inset-0 opacity-70" />
          <AnimatePresence mode="wait">
            <motion.div
              key={stage.name}
              initial={{ opacity: 0, scale: 0.97, x: 14 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.97, x: -14 }}
              transition={{ duration: 0.24 }}
              className="relative mx-auto max-w-md rounded-2xl border border-ink/10 bg-white p-5 shadow-[0_24px_60px_rgba(11,31,58,.13)]"
            >
              <div className="flex items-center justify-between">
                <span className="eyebrow text-muted">{stage.label}</span>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 font-mono text-xs font-medium text-blue-800">
                  IN PROGRESS
                </span>
              </div>
              <h4 className="mt-6 text-xl font-bold tracking-[-.04em]">
                {stage.title}
              </h4>
              <p className="mt-1.5 text-sm text-muted">{stage.meta}</p>
              <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-mist">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stage.progress}%` }}
                  className="h-full rounded-full bg-ink"
                />
              </div>
              <div className="mt-2 flex justify-between font-mono text-xs text-muted">
                <span>WORKFLOW PROGRESS</span>
                <span>{stage.progress}%</span>
              </div>
              <div className="mt-7 space-y-2">
                {[
                  "Source record linked",
                  "Ownership assigned",
                  active > 2
                    ? "Physical event recorded"
                    : "Approval trail active",
                ].map((item, index) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-lg bg-mist p-3 text-sm font-semibold"
                  >
                    <span
                      className={cn(
                        "grid size-5 place-items-center rounded-full",
                        index < 2
                          ? "bg-ink text-accent"
                          : "border border-line bg-white text-muted",
                      )}
                    >
                      {index < 2 ? (
                        <Check size={11} />
                      ) : (
                        <PackageOpen size={10} />
                      )}
                    </span>
                    {item}
                  </div>
                ))}
              </div>
              <button className="mt-5 flex w-full items-center justify-between rounded-xl bg-accent px-4 py-3 text-sm font-bold text-white">
                {stage.action}
                <ArrowRight size={14} />
              </button>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
