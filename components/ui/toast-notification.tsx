"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, CircleAlert, Settings2, X } from "lucide-react";

type Props = {
  success?: string;
  error?: string;
  setupError?: string;
};

export function ToastNotification({ success, error, setupError }: Props) {
  const message = error ?? setupError ?? success;
  const tone = error ? "error" : setupError ? "setup" : "success";

  if (!message) return null;

  return <Toast key={`${tone}:${message}`} message={message} tone={tone} />;
}

function Toast({
  message,
  tone,
}: {
  message: string;
  tone: "success" | "error" | "setup";
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("success");
    url.searchParams.delete("error");
    window.history.replaceState(window.history.state, "", url);

    const timeout = window.setTimeout(
      () => setVisible(false),
      tone === "success" ? 7_000 : 11_000,
    );
    return () => window.clearTimeout(timeout);
  }, [message, tone]);

  const details = {
    success: {
      title: "Action completed",
      description: "Your latest workspace change was saved successfully.",
      icon: CheckCircle2,
      iconClass: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      barClass: "bg-emerald-500",
    },
    error: {
      title: "Action needs attention",
      description: "The requested action could not be completed as expected.",
      icon: CircleAlert,
      iconClass: "bg-red-50 text-red-700 ring-red-100",
      barClass: "bg-red-500",
    },
    setup: {
      title: "Setup required",
      description: "Complete the required configuration before trying again.",
      icon: Settings2,
      iconClass: "bg-amber-50 text-amber-800 ring-amber-100",
      barClass: "bg-amber-500",
    },
  }[tone];
  const Icon = details.icon;
  const duration = tone === "success" ? 7 : 11;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.aside
          role={tone === "success" ? "status" : "alert"}
          aria-live={tone === "success" ? "polite" : "assertive"}
          initial={{ opacity: 0, y: -14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: 24, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 360, damping: 30 }}
          className="fixed right-3 top-20 z-[120] w-[calc(100vw-24px)] max-w-[430px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_70px_rgba(15,36,71,.2)] sm:right-6"
        >
          <div className="flex items-start gap-3 p-4 sm:p-5">
            <span
              className={`grid size-10 shrink-0 place-items-center rounded-xl ring-1 ${details.iconClass}`}
            >
              <Icon size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-950">
                  {details.title}
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-[.08em] text-slate-400">
                  Just now
                </span>
              </div>
              <p className="mt-1 text-sm font-medium leading-5 text-slate-700">
                {message}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {details.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setVisible(false)}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Dismiss notification"
            >
              <X size={15} />
            </button>
          </div>
          <motion.div
            className={`h-1 origin-left ${details.barClass}`}
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration, ease: "linear" }}
          />
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
