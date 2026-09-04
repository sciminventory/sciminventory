"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
};

export function AdminActionButton({
  children,
  className,
  variant = "primary",
  disabled = false,
}: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60",
        variant === "primary" && "bg-accent text-white hover:bg-blue-700",
        variant === "secondary" &&
          "border border-line bg-white text-ink hover:border-blue-200 hover:bg-blue-50",
        variant === "danger" &&
          "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
        className,
      )}
    >
      {pending && <LoaderCircle className="animate-spin" size={13} />}
      {children}
    </button>
  );
}
