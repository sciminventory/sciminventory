"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
};

export function ScrollReveal({
  children,
  className,
  delay = 0,
  distance = 36,
}: ScrollRevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: distance, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: false, amount: 0.16, margin: "0px 0px -8% 0px" }}
      transition={{
        duration: 0.68,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

export function ScrollMotion() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 28,
    mass: 0.25,
  });
  const orbY = useTransform(scrollYProgress, [0, 1], [0, 360]);

  return (
    <>
      <motion.div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-[70] h-[3px] origin-left bg-accent"
        style={{ scaleX }}
      />
      <motion.div
        aria-hidden="true"
        className={cn(
          "pointer-events-none fixed -right-40 top-1/4 z-0 size-[420px] rounded-full",
          "bg-blue-300/10 blur-[110px]",
        )}
        style={{ y: orbY }}
      />
    </>
  );
}
