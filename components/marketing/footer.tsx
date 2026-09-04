import { BrandMark } from "@/components/brand-mark";
import { ScrollReveal } from "@/components/motion/scroll-motion";

const columns = [
  {
    title: "Product",
    links: [
      "Inventory",
      "Procurement",
      "Warehousing",
      "Suppliers",
      "Logistics",
    ],
  },
  { title: "Company", links: ["About", "Security", "Careers", "Contact"] },
  {
    title: "Resources",
    links: ["Product guide", "Help center", "System status", "API docs"],
  },
];

export function Footer() {
  return (
    <footer className="bg-ink py-16 text-white">
      <div className="shell">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
          <ScrollReveal distance={20}>
            <span className="inline-flex rounded-xl bg-white p-3">
              <BrandMark />
            </span>
            <p className="mt-5 max-w-xs text-sm leading-6 text-white/45">
              Supply chain clarity, from requirement to warehouse shelf.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.08} distance={20}>
            <div className="grid grid-cols-2 gap-8 min-[480px]:grid-cols-3 min-[480px]:gap-5">
              {columns.map((column) => (
                <div key={column.title}>
                  <h3 className="eyebrow text-white/35">{column.title}</h3>
                  <div className="mt-5 space-y-3">
                    {column.links.map((link) => (
                      <a
                        key={link}
                        href={link === "Careers" ? "/careers" : "#"}
                        className="block text-xs text-white/65 transition-colors hover:text-white"
                      >
                        {link}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
        <div className="mt-16 flex flex-col justify-between gap-3 border-t border-white/10 pt-6 font-mono text-[9px] text-white/35 sm:flex-row">
          <span>© 2026 PRIORITY HANDLING LOGISTICS, INC.</span>
          <span>OPERATIONAL CLARITY · BUILT IN</span>
        </div>
      </div>
    </footer>
  );
}
