"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";

type PasswordFieldProps = {
  name: string;
  placeholder: string;
  autoComplete: string;
};

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative block">
      <KeyRound
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
        size={16}
      />
      <input
        {...props}
        required
        minLength={8}
        type={visible ? "text" : "password"}
        className="h-12 w-full rounded-xl border border-line bg-white pl-11 pr-12 text-sm outline-none transition placeholder:text-slate-400 hover:border-blue-200 focus:border-accent focus:ring-4 focus:ring-blue-100"
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted transition hover:bg-mist hover:text-ink"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </span>
  );
}
