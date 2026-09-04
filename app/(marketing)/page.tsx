import { ArrowDown, ArrowUpRight, Play } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/header";
import { HeroPreview } from "@/components/marketing/hero-preview";
import {
  CapabilitySection,
  CtaSection,
  TrustSection,
  WarehouseSection,
  WorkflowSection,
} from "@/components/marketing/landing-sections";
import { Footer } from "@/components/marketing/footer";
import { ButtonLink } from "@/components/ui/button";
import { ScrollMotion } from "@/components/motion/scroll-motion";

export default function Home() {
  return (
    <main className="overflow-hidden">
      <ScrollMotion />
      <MarketingHeader />
      <section className="relative bg-paper pb-20 pt-28 sm:pb-24 sm:pt-44">
        <div className="grid-fade pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-[540px] w-[760px] -translate-x-1/2 rounded-full bg-accent/20 blur-[110px]" />
        <div className="shell relative text-center">
          <div className="mx-auto inline-flex max-w-full items-center gap-2 rounded-full border border-ink/10 bg-white/70 px-3 py-1.5 font-mono text-xs font-medium uppercase tracking-[.07em] shadow-sm backdrop-blur sm:tracking-[.09em]">
            <span className="size-1.5 rounded-full bg-accent ring-4 ring-accent/20" />{" "}
            Built for real operational work <ArrowUpRight size={11} />
          </div>
          <h1 className="text-balance mx-auto mt-7 max-w-5xl text-[clamp(2.55rem,8vw,6.9rem)] font-bold leading-[.92] tracking-[-.065em] sm:leading-[.9] sm:tracking-[-.075em]">
            Your supply chain,
            <br />
            <span className="text-muted/45">finally in sync.</span>
          </h1>
          <p className="text-balance mx-auto mt-8 max-w-2xl text-base leading-8 text-muted sm:text-lg">
            Manage inventory, procurement, suppliers, warehouses, and logistics
            from one connected operational workspace.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/signup" variant="accent" size="lg" className="w-full min-[380px]:w-auto">
              Start free <ArrowUpRight size={16} />
            </ButtonLink>
            <ButtonLink href="#workflow" variant="secondary" size="lg" className="w-full min-[380px]:w-auto">
              <Play size={14} fill="currentColor" /> View product demo
            </ButtonLink>
          </div>
          <a
            href="#product"
            className="mx-auto mt-14 flex w-fit items-center gap-2 text-sm font-semibold text-muted"
          >
            <ArrowDown size={13} /> Explore the platform
          </a>
          <HeroPreview />
        </div>
      </section>
      <CapabilitySection />
      <WorkflowSection />
      <WarehouseSection />
      <TrustSection />
      <CtaSection />
      <Footer />
    </main>
  );
}
