import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CheckCircle2, GraduationCap, MapPin } from "lucide-react";
import { ScrollReveal } from "@/components/motion/scroll-motion";
import { loadOpenJob } from "@/lib/careers";

export async function generateMetadata({ params }: PageProps<"/careers/[jobId]">): Promise<Metadata> {
  const { jobId } = await params;
  const job = await loadOpenJob(jobId);
  return job ? { title: job.title, description: job.description.slice(0, 150) } : { title: "Position unavailable" };
}

export default async function CareerDetailPage({ params }: PageProps<"/careers/[jobId]">) {
  const { jobId } = await params;
  const job = await loadOpenJob(jobId);
  if (!job) notFound();
  return <section className="pb-24 pt-32 sm:pt-40"><div className="shell"><Link href="/careers" className="inline-flex items-center gap-2 text-xs font-semibold text-muted transition hover:text-blue-700"><ArrowLeft size={14} /> All opportunities</Link><div className="mt-8 grid gap-10 lg:grid-cols-[1fr_340px]"><ScrollReveal distance={18}><p className="font-mono text-[9px] uppercase tracking-[.1em] text-blue-700">{job.reference} · {job.organization_name}</p><h1 className="mt-4 text-[clamp(2.8rem,6vw,5.5rem)] font-bold leading-[.94] tracking-[-.065em]">{job.title}</h1><div className="mt-7 flex flex-wrap gap-2"><Pill><BriefcaseBusiness size={12} />{job.department}</Pill><Pill><MapPin size={12} />{job.location ?? "Flexible"}</Pill><Pill>{humanize(job.employment_type)}</Pill></div><div className="mt-12 border-t border-line pt-9"><h2 className="text-xl font-bold">About the role</h2><p className="mt-5 whitespace-pre-line text-sm leading-7 text-muted">{job.description}</p></div><div className="mt-10 grid gap-8 sm:grid-cols-2"><Requirement title="Required skills" values={job.required_skills} /><Requirement title="Preferred skills" values={job.preferred_skills} /></div></ScrollReveal><ScrollReveal delay={0.08} distance={18}><aside className="sticky top-28 rounded-2xl border border-blue-100 bg-white p-6 shadow-[0_24px_70px_rgba(37,99,235,.1)]"><span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-700"><GraduationCap size={20} /></span><h2 className="mt-5 text-lg font-bold">Role profile</h2><dl className="mt-6 space-y-4 text-xs"><Detail label="Experience" value={`${job.min_years_experience}+ years`} /><Detail label="Education" value={humanize(job.education_level)} /><Detail label="Work type" value={humanize(job.employment_type)} /></dl><Link href={`/careers/${job.id}/apply`} className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-bold text-white shadow-[0_14px_34px_rgba(37,99,235,.22)] transition hover:-translate-y-0.5 hover:bg-blue-700">Apply for this role <ArrowRight size={15} /></Link><p className="mt-4 text-center text-[9px] leading-5 text-muted">Applications are reviewed by the hiring team. Automated ranking never makes the final decision.</p></aside></ScrollReveal></div></div></section>;
}

function Pill({ children }: { children: React.ReactNode }) { return <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[10px] font-medium text-blue-700">{children}</span>; }
function Requirement({ title, values }: { title: string; values: string[] }) { return <div><h2 className="text-sm font-bold">{title}</h2><div className="mt-4 space-y-2">{values.length ? values.map((value) => <p key={value} className="flex items-center gap-2 text-xs text-muted"><CheckCircle2 className="text-blue-600" size={14} />{value}</p>) : <p className="text-xs text-muted">No specific requirements listed.</p>}</div></div>; }
function Detail({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 border-b border-line pb-4"><dt className="text-muted">{label}</dt><dd className="text-right font-semibold">{value}</dd></div>; }
function humanize(value: string) { return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }
