import {
  ArrowRight,
  Boxes,
  FileCheck2,
  Fingerprint,
  GitPullRequestArrow,
  PackageSearch,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { WorkflowExplorer } from "@/components/marketing/workflow-explorer";
import { ScrollReveal } from "@/components/motion/scroll-motion";

const capabilities = [
  {
    n: "01",
    icon: PackageSearch,
    title: "Inventory clarity",
    body: "See what is available, reserved, inbound, damaged, and quarantined—across every location.",
  },
  {
    n: "02",
    icon: GitPullRequestArrow,
    title: "Procurement flow",
    body: "Connect requisitions, approvals, quotes, awards, and purchase orders in one traceable lifecycle.",
  },
  {
    n: "03",
    icon: Warehouse,
    title: "Warehouse control",
    body: "Coordinate receiving, inspection, putaway, transfers, counts, picking, and dispatch at bin level.",
  },
  {
    n: "04",
    icon: Users,
    title: "Supplier intelligence",
    body: "Keep vendor performance, qualifications, contacts, documents, and purchasing history together.",
  },
];

export function CapabilitySection() {
  return (
    <section
      id="product"
      className="border-y border-line bg-white py-24 sm:py-32"
    >
      <div className="shell">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
          <ScrollReveal>
            <p className="eyebrow text-muted">
              One source of operational truth
            </p>
            <h2 className="mt-5 max-w-md text-4xl font-bold tracking-[-.055em] sm:text-5xl">
              Built around the work, not the modules.
            </h2>
          </ScrollReveal>
          <ScrollReveal className="self-end lg:justify-self-end" delay={0.08}>
            <p className="max-w-xl text-base leading-8 text-muted">
              The platform follows every material and decision from request to
              receipt. Teams see the same story, act from the same context, and
              preserve what happened.
            </p>
          </ScrollReveal>
        </div>
        <div className="mt-16 grid border-l border-t border-line sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map(({ n, icon: Icon, title, body }) => (
            <ScrollReveal key={n} delay={Number(n) * 0.045} className="h-full">
              <article className="group min-h-72 border-b border-r border-line p-6 transition-colors hover:bg-mist/70">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-muted">{n}</span>
                  <Icon size={20} strokeWidth={1.7} />
                </div>
                <h3 className="mt-20 text-xl font-bold tracking-[-.04em]">
                  {title}
                </h3>
                <p className="mt-3 text-base leading-7 text-muted">{body}</p>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WorkflowSection() {
  return (
    <section id="workflow" className="bg-[#f2f7ff] py-24 sm:py-32">
      <div className="shell">
        <ScrollReveal className="max-w-2xl">
          <p className="eyebrow text-muted">The connected lifecycle</p>
          <h2 className="mt-5 text-4xl font-bold tracking-[-.055em] sm:text-5xl">
            From demand signal to warehouse shelf.
          </h2>
          <p className="mt-5 text-base leading-8 text-muted">
            Select a stage to see how context travels with the work.
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.08}>
          <WorkflowExplorer />
        </ScrollReveal>
      </div>
    </section>
  );
}

export function WarehouseSection() {
  return (
    <section id="solutions" className="overflow-hidden bg-paper py-24 sm:py-32">
      <div className="shell grid items-center gap-16 lg:grid-cols-2">
        <ScrollReveal>
          <p className="eyebrow text-muted">Smart warehousing</p>
          <h2 className="mt-5 text-4xl font-bold tracking-[-.055em] sm:text-5xl">
            Know where every unit lives.
          </h2>
          <p className="mt-6 max-w-lg text-base leading-8 text-muted">
            Turn each receiving, inspection, putaway, transfer, and count into a
            controlled event. Human-readable locations keep operators moving;
            immutable ledgers keep operations accountable.
          </p>
          <div className="mt-8 grid gap-3 min-[380px]:grid-cols-2">
            {[
              { icon: ScanLine, t: "Scanner ready" },
              { icon: Boxes, t: "Bin-level stock" },
              { icon: Truck, t: "Inbound visibility" },
              { icon: FileCheck2, t: "Receipt traceability" },
            ].map(({ icon: Icon, t }) => (
              <div
                key={t}
                className="flex items-center gap-3 border-t border-line py-4 text-sm font-semibold"
              >
                <Icon size={17} />
                {t}
              </div>
            ))}
          </div>
        </ScrollReveal>
        <ScrollReveal delay={0.1} distance={44}>
          <WarehouseMap />
        </ScrollReveal>
      </div>
    </section>
  );
}

function WarehouseMap() {
  return (
    <div className="relative rounded-[28px] bg-ink p-5 text-white shadow-[0_30px_80px_rgba(11,31,58,.18)] sm:p-8">
      <div className="noise absolute inset-0 rounded-[28px] opacity-20" />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-accent">Manila Central</p>
            <h3 className="mt-2 text-lg font-bold">ZONE-A · Storage map</h3>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1.5 font-mono text-xs">
            92% UTILIZED
          </span>
        </div>
        <div className="mt-8 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {Array.from({ length: 24 }, (_, i) => (
            <div
              key={i}
              className={`group relative aspect-square rounded-lg border p-2 transition-transform hover:-translate-y-1 ${[5, 11, 19].includes(i) ? "border-amber-300/40 bg-amber-300/20" : "border-white/10 bg-white/[.06]"}`}
            >
              <span className="font-mono text-xs text-white/45">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={`absolute bottom-2 left-2 right-2 h-1 rounded-full ${[5, 11, 19].includes(i) ? "bg-amber-300" : "bg-accent/70"}`}
              />
            </div>
          ))}
        </div>
        <div className="mt-7 flex flex-wrap gap-5 border-t border-white/10 pt-5 text-sm text-white/55">
          <span className="flex items-center gap-2">
            <i className="size-2 rounded-full bg-accent" />
            Available capacity
          </span>
          <span className="flex items-center gap-2">
            <i className="size-2 rounded-full bg-amber-300" />
            Needs attention
          </span>
          <span className="w-full font-mono sm:ml-auto sm:w-auto">AISLE 02 · RACKS 01—24</span>
        </div>
      </div>
    </div>
  );
}

export function TrustSection() {
  return (
    <section
      id="security"
      className="border-y border-line bg-white py-24 sm:py-32"
    >
      <div className="shell">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr]">
          <ScrollReveal>
            <div className="grid size-12 place-items-center rounded-2xl bg-accent">
              <Fingerprint size={23} />
            </div>
            <p className="eyebrow mt-8 text-muted">Secure by structure</p>
            <h2 className="mt-5 max-w-lg text-4xl font-bold tracking-[-.055em] sm:text-5xl">
              Your operation stays yours.
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
              {[
                {
                  icon: ShieldCheck,
                  t: "Tenant isolation",
                  b: "Row-level policies enforce organization boundaries at the database layer.",
                },
                {
                  icon: Users,
                  t: "Role-based access",
                  b: "Permissions and warehouse assignments narrow what every teammate can do.",
                },
                {
                  icon: FileCheck2,
                  t: "Immutable history",
                  b: "Commercial, approval, document, and inventory events retain their audit context.",
                },
                {
                  icon: Sparkles,
                  t: "Designed for focus",
                  b: "Marketing has motion. Warehouse execution remains calm, fast, and predictable.",
                },
              ].map(({ icon: Icon, t, b }) => (
                <div key={t} className="bg-paper p-6">
                  <Icon size={20} />
                  <h3 className="mt-8 font-bold">{t}</h3>
                  <p className="mt-2 text-base leading-7 text-muted">{b}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

export function CtaSection() {
  return (
    <section className="bg-accent py-20 text-white sm:py-24">
      <div className="shell flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-end">
        <ScrollReveal>
          <p className="eyebrow">Ready when your operation is.</p>
          <h2 className="mt-5 max-w-3xl text-4xl font-bold tracking-[-.06em] sm:text-6xl">
            Put your whole supply chain on the same page.
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={0.08} distance={20}>
          <ButtonLink href="/signup" variant="secondary" size="lg">
            Start your workspace <ArrowRight size={17} />
          </ButtonLink>
        </ScrollReveal>
      </div>
    </section>
  );
}
