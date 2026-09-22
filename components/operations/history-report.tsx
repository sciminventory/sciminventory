import Link from "next/link";
import { Download, FileClock } from "lucide-react";
import { historyLabels, historyModules, humanizeHistoryValue, type HistoryEvent, type HistoryModule } from "@/lib/operations/history";

export function HistoryReport({ activeModule, events }: { activeModule: HistoryModule; events: HistoryEvent[] }) {
  return (
    <div className="min-w-0 w-full p-4 sm:p-6 lg:p-8 xl:p-10">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow text-muted">Governance · Audit trail</p>
          <h1 className="mt-2 text-2xl font-bold tracking-[-.045em]">History & reports</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Review timestamped module activity and export the selected history as a PDF report.</p>
        </div>
        <a href={`/dashboard/history/report?module=${activeModule}`} className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-bold text-white transition hover:bg-blue-700">
          <Download size={15} /> Download PDF
        </a>
      </header>

      <nav className="mt-6 flex gap-2 overflow-x-auto pb-2" aria-label="History modules">
        {historyModules.map((module) => <Link key={module} href={`/dashboard/history?module=${module}`} className={`whitespace-nowrap rounded-lg border px-4 py-2.5 text-sm font-bold transition ${module === activeModule ? "border-blue-600 bg-blue-600 text-white" : "border-line bg-white text-muted hover:border-blue-200 hover:text-blue-700"}`}>{historyLabels[module]}</Link>)}
      </nav>

      <section className="mt-4 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_14px_40px_rgba(25,72,133,.055)]">
        <div className="flex items-center justify-between border-b border-line p-5">
          <div><h2 className="font-bold">{historyLabels[activeModule]} history</h2><p className="mt-1 text-sm text-muted">{events.length.toLocaleString()} most recent recorded events</p></div>
          <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><FileClock size={18} /></span>
        </div>
        {events.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-line bg-mist font-mono text-xs uppercase tracking-wider text-muted"><tr><th className="px-5 py-3 font-medium">Date & time</th><th className="px-5 py-3 font-medium">Action</th><th className="px-5 py-3 font-medium">Record type</th><th className="px-5 py-3 font-medium">Record ID</th></tr></thead><tbody>{events.map((event) => <tr key={event.id} className="border-b border-line last:border-0"><td className="px-5 py-4 font-mono text-xs">{formatDateTime(event.occurredAt)}</td><td className="px-5 py-4 font-semibold">{humanizeHistoryValue(event.action)}</td><td className="px-5 py-4 text-muted">{humanizeHistoryValue(event.entityType)}</td><td className="max-w-64 truncate px-5 py-4 font-mono text-xs text-muted">{event.entityId ?? "—"}</td></tr>)}</tbody></table></div> : <div className="grid min-h-56 place-items-center p-8 text-center"><div><FileClock className="mx-auto text-slate-300" size={28} /><h3 className="mt-4 font-bold">No {historyLabels[activeModule].toLowerCase()} history yet</h3><p className="mt-2 text-sm text-muted">New module activity will be recorded here automatically.</p></div></div>}
      </section>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
