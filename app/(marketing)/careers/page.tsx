import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, MapPin, Search, Sparkles } from "lucide-react";
import { ScrollReveal } from "@/components/motion/scroll-motion";
import { loadOpenJobs } from "@/lib/careers";

export const metadata: Metadata = { title: "Careers", description: "Explore open roles and submit an application." };
export const dynamic = "force-dynamic";

export default async function CareersPage() {
  const { jobs, available } = await loadOpenJobs();
  return (
    <>
      <section className="relative overflow-hidden border-b border-line pb-20 pt-36 sm:pt-44">
        <div className="grid-fade pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-blue-300/25 blur-[110px]" />
        <div className="shell relative">
          <ScrollReveal distance={18}>
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 font-mono text-xs uppercase tracking-[.1em] text-blue-700"><Sparkles size={11} /> Careers</span>
            <h1 className="mt-7 max-w-4xl text-[clamp(3rem,7vw,6.5rem)] font-bold leading-[.92] tracking-[-.07em]">Build operations that move the world.</h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-muted sm:text-lg">Explore current opportunities and submit your application through our secure candidate portal.</p>
          </ScrollReveal>
        </div>
      </section>
      <section className="py-20">
        <div className="shell">
          <ScrollReveal distance={16}>
            <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow text-blue-700">Open opportunities</p><h2 className="mt-3 text-3xl font-bold tracking-[-.045em]">Find your next role</h2></div><span className="rounded-full border border-line bg-white px-4 py-2 font-mono text-xs text-muted">{jobs.length} OPEN ROLE{jobs.length === 1 ? "" : "S"}</span></div>
          </ScrollReveal>
          {!available ? <EmptyState title="Careers are being configured" body="The public application database update has not been installed yet." /> : jobs.length === 0 ? <EmptyState title="No open positions right now" body="Please check back soon for new opportunities." /> : <div className="mt-10 grid gap-5 lg:grid-cols-2">{jobs.map((job, index) => <ScrollReveal key={job.id} delay={Math.min(index * 0.04, 0.2)} distance={18}><Link href={`/careers/${job.id}`} className="group block h-full rounded-2xl border border-line bg-white p-6 shadow-[0_16px_48px_rgba(25,72,133,.055)] transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_24px_60px_rgba(37,99,235,.12)]"><div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><BriefcaseBusiness size={19} /></span><div className="min-w-0"><p className="font-mono text-xs uppercase tracking-[.08em] text-blue-700">{job.reference} · {job.organization_name}</p><h3 className="mt-2 text-xl font-bold tracking-[-.035em]">{job.title}</h3><p className="mt-2 text-sm text-muted">{job.department}</p></div><ArrowRight className="ml-auto shrink-0 text-blue-500 transition-transform group-hover:translate-x-1" size={18} /></div><div className="mt-7 flex flex-wrap gap-2"><Pill><MapPin size={11} />{job.location ?? "Flexible"}</Pill><Pill>{humanize(job.employment_type)}</Pill><Pill>{job.min_years_experience}+ years</Pill></div></Link></ScrollReveal>)}</div>}
        </div>
      </section>
    </>
  );
}

function Pill({ children }: { children: React.ReactNode }) { return <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">{children}</span>; }
function EmptyState({ title, body }: { title: string; body: string }) { return <div className="mt-10 grid min-h-72 place-items-center rounded-2xl border border-dashed border-blue-200 bg-white text-center"><div><Search className="mx-auto text-blue-300" size={30} /><h3 className="mt-4 text-lg font-bold">{title}</h3><p className="mt-2 text-sm text-muted">{body}</p></div></div>; }
function humanize(value: string) { return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }
