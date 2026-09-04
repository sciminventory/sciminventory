"use client";

import { useFormStatus } from "react-dom";
import { ArrowRight, LoaderCircle } from "lucide-react";

export function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(37,99,235,.22)] transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-[0_16px_38px_rgba(37,99,235,.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:translate-y-0 disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? (
        <>
          <LoaderCircle className="animate-spin" size={16} /> Please wait…
        </>
      ) : (
        <>
          {label} <ArrowRight size={16} />
        </>
      )}
    </button>
  );
}
