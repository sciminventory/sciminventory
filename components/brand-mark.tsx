import Image from "next/image";
import Link from "next/link";
import logo from "@/Payroll-logo-removebg.png";
import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  compact = false,
  iconOnly = false,
}: {
  className?: string;
  compact?: boolean;
  iconOnly?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex shrink-0 items-center",
        iconOnly && "h-11 w-11 overflow-hidden",
        className,
      )}
      aria-label="Priority Handling Logistics home"
    >
      <Image
        src={logo}
        alt="Priority Handling Logistics, Inc."
        className={cn(
          "h-auto object-contain object-left",
          iconOnly ? "w-28 max-w-none" : compact ? "w-24" : "w-36",
        )}
        sizes={iconOnly ? "112px" : compact ? "96px" : "144px"}
        priority
      />
    </Link>
  );
}
