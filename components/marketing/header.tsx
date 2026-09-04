"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  ["Product", "/#product"],
  ["Workflow", "/#workflow"],
  ["Solutions", "/#solutions"],
  ["Security", "/#security"],
  ["Careers", "/careers"],
] as const;

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 18);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled && "border-b border-ink/8 bg-paper/88 backdrop-blur-xl",
      )}
    >
      <div className="shell flex h-[72px] items-center justify-between">
        <BrandMark />
        <nav
          className="hidden items-center gap-8 lg:flex"
          aria-label="Main navigation"
        >
          {navigation.map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="text-[13px] font-semibold text-ink/65 transition-colors hover:text-ink"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          <ButtonLink href="/login" variant="ghost" size="sm">
            Sign in
          </ButtonLink>
          <ButtonLink href="/signup" variant="accent" size="sm">
            Start free <ArrowUpRight size={15} />
          </ButtonLink>
        </div>
        <button
          className="grid size-10 place-items-center rounded-full border border-line sm:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="border-t border-line bg-paper px-5 pb-6 pt-3 sm:hidden"
          >
            <nav className="flex flex-col" aria-label="Mobile navigation">
              {navigation.map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="border-b border-line py-4 text-base font-semibold"
                >
                  {label}
                </a>
              ))}
            </nav>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <ButtonLink href="/login" variant="secondary">
                Sign in
              </ButtonLink>
              <ButtonLink href="/signup" variant="accent">
                Start free
              </ButtonLink>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
