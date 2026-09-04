import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BriefcaseBusiness, MapPin } from "lucide-react";
import { PublicApplicationForm } from "@/components/careers/public-application-form";
import { loadOpenJob } from "@/lib/careers";

export const metadata: Metadata = { title: "Submit application", robots: { index: false, follow: false } };

export default async function ApplyPage({ params }: PageProps<"/careers/[jobId]/apply">) {
  const { jobId } = await params;
  const job = await loadOpenJob(jobId);
  if (!job) notFound();
  return <section className="relative overflow-hidden pb-24 pt-32 sm:pt-40"><div className="grid-fade pointer-events-none absolute inset-0 opacity-60" /><div className="pointer-events-none absolute right-0 top-20 h-[420px] w-[520px] rounded-full bg-blue-300/20 blur-[100px]" /><div className="shell relative"><Link href={`/careers/${job.id}`} className="inline-flex items-center gap-2 text-xs font-semibold text-muted transition hover:text-blue-700"><ArrowLeft size={14} /> Back to job details</Link><div className="mt-8 grid gap-8 lg:grid-cols-[300px_1fr]"><aside className="h-fit rounded-2xl border border-blue-100 bg-blue-950 p-6 text-white lg:sticky lg:top-28"><p className="font-mono text-[9px] uppercase tracking-[.1em] text-blue-300">{job.reference}</p><h2 className="mt-3 text-xl font-bold">{job.title}</h2><p className="mt-2 text-xs text-white/50">{job.organization_name}</p><div className="mt-7 space-y-3 border-t border-white/10 pt-6 text-[10px] text-white/70"><p className="flex items-center gap-2"><BriefcaseBusiness size={13} />{job.department} · {humanize(job.employment_type)}</p><p className="flex items-center gap-2"><MapPin size={13} />{job.location ?? "Flexible"}</p></div><p className="mt-7 text-[9px] leading-5 text-white/45">Only authorized hiring staff can access submitted applicant information.</p></aside><PublicApplicationForm jobId={job.id} organizationId={job.organization_id} jobTitle={job.title} /></div></div></section>;
}

function humanize(value: string) { return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }
