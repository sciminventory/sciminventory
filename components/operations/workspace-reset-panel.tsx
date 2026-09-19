"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, DatabaseZap, ShieldAlert, X } from "lucide-react";
import { resetWorkspaceData } from "@/app/(app)/dashboard/administration/actions";
import { AdminActionButton } from "@/components/operations/admin-action-button";

type Props = {
  organizationId: string;
  organizationName: string;
};

export function WorkspaceResetPanel({
  organizationId,
  organizationName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [confirmationName, setConfirmationName] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const confirmed = confirmationName === organizationName && acknowledged;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <>
      <section
        id="danger-zone"
        className="mt-6 scroll-mt-24 overflow-hidden rounded-2xl border border-red-200 bg-white"
      >
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-700">
              <DatabaseZap size={18} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-red-900">Danger zone</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                Permanently clear operational, vendor, logistics, recruitment,
                and document data. The organization, team access, security
                settings, and audit history remain available.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700 transition hover:bg-red-100"
          >
            <DatabaseZap size={14} /> Reset workspace data
          </button>
        </div>
      </section>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="Close reset confirmation"
              className="fixed inset-0 z-[130] bg-[#07172d]/55 backdrop-blur-[3px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="reset-workspace-title"
              className="fixed inset-x-3 top-1/2 z-[140] mx-auto w-auto max-w-xl -translate-y-1/2 overflow-hidden rounded-2xl border border-red-200 bg-white shadow-[0_30px_100px_rgba(7,23,45,.35)]"
              initial={{ opacity: 0, y: "-46%", scale: 0.96 }}
              animate={{ opacity: 1, y: "-50%", scale: 1 }}
              exit={{ opacity: 0, y: "-46%", scale: 0.96 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
            >
              <div className="flex items-start gap-3 border-b border-red-100 bg-red-50 p-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-red-700 shadow-sm">
                  <ShieldAlert size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs uppercase tracking-[.1em] text-red-700">
                    Permanent operation
                  </p>
                  <h2
                    id="reset-workspace-title"
                    className="mt-1 text-xl font-bold tracking-[-.035em] text-red-950"
                  >
                    Reset workspace data?
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid size-9 place-items-center rounded-lg text-red-500 transition hover:bg-white hover:text-red-800"
                  aria-label="Close"
                >
                  <X size={17} />
                </button>
              </div>

              <form action={resetWorkspaceData} className="p-5">
                <input type="hidden" name="organizationId" value={organizationId} />
                <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                  <AlertTriangle className="mt-0.5 shrink-0" size={17} />
                  <p>
                    This cannot be undone. All business modules will return to
                    an empty state, and uploaded workspace files will be
                    permanently removed.
                  </p>
                </div>

                <label className="mt-5 block">
                  <span className="text-sm font-bold text-slate-800">
                    Type <strong>{organizationName}</strong> to confirm
                  </span>
                  <input
                    name="confirmationName"
                    value={confirmationName}
                    onChange={(event) => setConfirmationName(event.target.value)}
                    autoComplete="off"
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
                  />
                </label>

                <label className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm leading-5 text-slate-700">
                  <input
                    type="checkbox"
                    name="acknowledgePermanentDeletion"
                    checked={acknowledged}
                    onChange={(event) => setAcknowledged(event.target.checked)}
                    className="mt-0.5 size-4 shrink-0 accent-red-600"
                  />
                  I understand that operational data and uploaded files cannot
                  be recovered after this reset.
                </label>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <AdminActionButton
                    variant="danger"
                    disabled={!confirmed}
                    className="h-11 px-5"
                  >
                    <DatabaseZap size={14} /> Permanently reset data
                  </AdminActionButton>
                </div>
              </form>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
