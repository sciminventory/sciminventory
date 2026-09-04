"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BriefcaseBusiness,
  BrainCircuit,
  CheckCircle2,
  CircleAlert,
  Download,
  FileText,
  Plus,
  ShieldCheck,
  Sparkles,
  UserRoundSearch,
  Users,
  X,
} from "lucide-react";
import { AdminActionButton } from "@/components/operations/admin-action-button";
import { ScrollReveal } from "@/components/motion/scroll-motion";
import { createApplicant, createJob, downloadRecruitmentResume, runApplicantScreening, updateApplicationStage, updateJobStatus } from "@/app/(app)/dashboard/recruitment/actions";
import type { Database, Json } from "@/types/database";
import { RecruitmentRealtimeSync } from "@/components/operations/recruitment-realtime-sync";

type JobStatus = Database["public"]["Enums"]["job_status"];
type ApplicationStage = Database["public"]["Enums"]["application_stage"];
type Section = "jobs" | "applicants" | "pipeline" | "screening";

export type RecruitmentJob = {
  id: string; reference: string; title: string; department: string; location: string | null;
  employment_type: string; status: JobStatus; required_skills: string[]; preferred_skills: string[];
  min_years_experience: number; education_level: string; created_at: string;
};
export type RecruitmentApplicant = { id: string; full_name: string; email: string; phone: string | null; location: string | null; source: string; created_at: string };
export type RecruitmentApplication = { id: string; job_id: string; applicant_id: string; application_reference: string; submission_channel: string; stage: ApplicationStage; years_experience: number; education_level: string; declared_skills: string[]; resume_file_name: string | null; screening_consent_at: string | null; applied_at: string; job_title: string; applicant_name: string };
export type ScreeningRun = { id: string; job_id: string; status: string; model_name: string; model_version: string; application_count: number; error_message: string | null; created_at: string; completed_at: string | null };
export type RecruitmentScore = { id: string; screening_run_id: string; application_id: string; rank: number; overall_score: number; semantic_score: number; skills_score: number; experience_score: number; education_score: number; matched_skills: string[]; missing_skills: string[]; explanation: Json; applicant_name: string; job_title: string };

type Props = {
  section: Section; organizationId: string; role: string; jobs: RecruitmentJob[];
  applicants: RecruitmentApplicant[]; applications: RecruitmentApplication[]; runs: ScreeningRun[];
  scores: RecruitmentScore[]; success?: string; error?: string; setupError?: string;
  openCreate?: boolean; accessDenied?: boolean;
  canManageJobs?: boolean; canManageApplicants?: boolean; canManagePipeline?: boolean; canRunScreening?: boolean;
};

const sections = {
  jobs: { eyebrow: "Recruitment · Workforce planning", title: "Job openings", description: "Define role requirements and manage the hiring demand pipeline.", action: "Create job", icon: BriefcaseBusiness },
  applicants: { eyebrow: "Recruitment · Talent records", title: "Applicants", description: "Create consented candidate profiles and attach them to active openings.", action: "Add applicant", icon: Users },
  pipeline: { eyebrow: "Recruitment · Hiring workflow", title: "Application pipeline", description: "Move applicants through controlled and auditable hiring stages.", action: "Add applicant", icon: UserRoundSearch },
  screening: { eyebrow: "Recruitment · Decision support", title: "AI screening", description: "Rank job-specific applications with explainable, identity-minimized fit signals.", action: "Run screening", icon: BrainCircuit },
} as const;
const stages: ApplicationStage[] = ["applied", "screening", "shortlisted", "interview", "offer", "hired", "rejected", "withdrawn"];
const fieldClass = "h-11 w-full rounded-xl border border-line bg-white px-3 text-xs outline-none transition focus:border-accent focus:ring-3 focus:ring-blue-100";
const labelClass = "mb-2 block font-mono text-[9px] font-medium uppercase tracking-[.08em] text-muted";

export function RecruitmentConsole(props: Props) {
  const [drawerOpen, setDrawerOpen] = useState(Boolean(props.openCreate));
  const copy = sections[props.section];
  const Icon = copy.icon;
  useEffect(() => {
    if (!drawerOpen) return;
    const old = document.body.style.overflow;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setDrawerOpen(false);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = old; window.removeEventListener("keydown", close); };
  }, [drawerOpen]);

  if (props.accessDenied) return <AccessDenied role={props.role} />;
  const openDrawer = () => setDrawerOpen(true);
  const canCreate = props.section === "jobs" ? props.canManageJobs : props.section === "applicants" || props.section === "pipeline" ? props.canManageApplicants : false;
  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 xl:p-10">
      <ScrollReveal distance={14}>
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div><div className="flex items-center gap-3"><p className="eyebrow text-muted">{copy.eyebrow}</p><RecruitmentRealtimeSync organizationId={props.organizationId} /></div><div className="mt-2 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon size={20} /></span><h1 className="text-3xl font-bold tracking-[-.05em]">{copy.title}</h1></div><p className="mt-3 text-sm text-muted">{copy.description}</p></div>
          {props.section === "screening" && props.canRunScreening ? <a href="#run-screening" className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 text-[11px] font-bold text-white"><Sparkles size={15} />{copy.action}</a> : canCreate ? <button type="button" onClick={openDrawer} className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 text-[11px] font-bold text-white"><Plus size={15} />{copy.action}</button> : <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-[10px] font-semibold text-muted"><ShieldCheck size={14} /> Read-only access</span>}
        </header>
      </ScrollReveal>

      {(props.success || props.error || props.setupError) && <div className={`mt-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-xs ${props.error || props.setupError ? "border-red-200 bg-red-50 text-red-800" : "border-blue-200 bg-blue-50 text-blue-800"}`}>{props.error || props.setupError ? <CircleAlert size={15} /> : <CheckCircle2 size={15} />}<span>{props.error ?? props.setupError ?? props.success}</span></div>}

      <ScrollReveal className="mt-6" distance={16}><div className="grid overflow-hidden rounded-2xl border border-line bg-white shadow-[0_14px_40px_rgba(25,72,133,.055)] sm:grid-cols-4"><Metric label="Open jobs" value={props.jobs.filter((job) => job.status === "open").length} /><Metric label="Applicants" value={props.applicants.length} /><Metric label="Active pipeline" value={props.applications.filter((application) => !["hired", "rejected", "withdrawn"].includes(application.stage)).length} /><Metric label="Hired" value={props.applications.filter((application) => application.stage === "hired").length} /></div></ScrollReveal>

      <ScrollReveal className="mt-6" distance={16}>
        {props.section === "jobs" && <Jobs jobs={props.jobs} organizationId={props.organizationId} canManage={Boolean(props.canManageJobs)} />}
        {props.section === "applicants" && <Applicants applicants={props.applicants} applications={props.applications} organizationId={props.organizationId} />}
        {props.section === "pipeline" && <Pipeline applications={props.applications} organizationId={props.organizationId} canManage={Boolean(props.canManagePipeline)} />}
        {props.section === "screening" && <Screening jobs={props.jobs} runs={props.runs} scores={props.scores} organizationId={props.organizationId} canRun={Boolean(props.canRunScreening)} />}
      </ScrollReveal>

      <AnimatePresence>{drawerOpen && canCreate && props.section !== "screening" && <RecruitmentDrawer title={props.section === "jobs" ? "Create job opening" : "Add applicant"} onClose={() => setDrawerOpen(false)}>{props.section === "jobs" ? <JobForm organizationId={props.organizationId} /> : <ApplicantForm organizationId={props.organizationId} jobs={props.jobs.filter((job) => ["open", "draft"].includes(job.status))} />}</RecruitmentDrawer>}</AnimatePresence>
    </div>
  );
}

function Jobs({ jobs, organizationId, canManage }: { jobs: RecruitmentJob[]; organizationId: string; canManage: boolean }) {
  return <Panel>{jobs.length ? <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><TableHead labels={["Job", "Department", "Requirements", "Created", "Status"]} /><tbody>{jobs.map((job) => <tr key={job.id} className="border-b border-line text-[11px] last:border-0"><td className="px-5 py-4"><p className="font-mono text-[9px] text-blue-700">{job.reference}</p><p className="mt-1 font-bold">{job.title}</p><p className="mt-1 text-[9px] text-muted">{humanize(job.employment_type)} · {job.location ?? "Flexible"}</p></td><td className="px-5 py-4">{job.department}</td><td className="max-w-xs px-5 py-4"><p>{job.min_years_experience} years · {humanize(job.education_level)}</p><div className="mt-2 flex flex-wrap gap-1">{job.required_skills.slice(0, 4).map((skill) => <Tag key={skill}>{skill}</Tag>)}</div></td><td className="px-5 py-4 font-mono text-[9px] text-muted">{formatDate(job.created_at)}</td><td className="px-5 py-4">{canManage ? <form action={updateJobStatus} className="flex gap-2"><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="jobId" value={job.id} /><select name="status" defaultValue={job.status} className="h-9 rounded-lg border border-line px-2 text-[10px]">{["draft", "open", "paused", "closed", "archived"].map((status) => <option key={status}>{status}</option>)}</select><AdminActionButton variant="secondary">Save</AdminActionButton></form> : <Tag>{humanize(job.status)}</Tag>}</td></tr>)}</tbody></table></div> : <Empty text="No job openings yet." />}</Panel>;
}

function Applicants({ applicants, applications, organizationId }: { applicants: RecruitmentApplicant[]; applications: RecruitmentApplication[]; organizationId: string }) {
  return <Panel>{applicants.length ? <div className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-3">{applicants.map((applicant) => { const personApplications = applications.filter((item) => item.applicant_id === applicant.id); return <article key={applicant.id} className="bg-white p-5"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-800">{initials(applicant.full_name)}</span><div className="min-w-0"><h2 className="truncate text-sm font-bold">{applicant.full_name}</h2><p className="mt-1 truncate text-[10px] text-muted">{applicant.email}</p></div></div><div className="mt-5 grid grid-cols-2 gap-3 text-[10px]"><div><p className="text-muted">Source</p><p className="mt-1 font-semibold">{humanize(applicant.source)}</p></div><div><p className="text-muted">Applications</p><p className="mt-1 font-semibold">{personApplications.length}</p></div></div>{personApplications.map((application) => <div key={application.id} className="mt-4 rounded-xl bg-blue-50 p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{application.job_title}</p><p className="mt-1 font-mono text-[9px] text-blue-700">{application.application_reference} · {humanize(application.stage)}</p><p className="mt-1 text-[8px] text-muted">{humanize(application.submission_channel)} application</p></div>{application.resume_file_name && <form action={downloadRecruitmentResume}><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="applicationId" value={application.id} /><button type="submit" title={`Download ${application.resume_file_name}`} className="grid size-8 shrink-0 place-items-center rounded-lg border border-blue-100 bg-white text-blue-700 transition hover:bg-blue-100"><Download size={13} /></button></form>}</div></div>)}</article>; })}</div> : <Empty text="No applicants yet." />}</Panel>;
}

function Pipeline({ applications, organizationId, canManage }: { applications: RecruitmentApplication[]; organizationId: string; canManage: boolean }) {
  return <div className="hide-scrollbar flex gap-4 overflow-x-auto pb-3">{stages.map((stage) => { const rows = applications.filter((application) => application.stage === stage); return <section key={stage} className="w-[285px] shrink-0 rounded-2xl border border-line bg-white shadow-sm"><div className="flex items-center justify-between border-b border-line px-4 py-3"><h2 className="text-xs font-bold">{humanize(stage)}</h2><span className="rounded-full bg-blue-50 px-2 py-1 font-mono text-[9px] text-blue-700">{rows.length}</span></div><div className="space-y-3 p-3">{rows.map((application) => <article key={application.id} className="rounded-xl border border-line p-4 shadow-sm"><h3 className="text-xs font-bold">{application.applicant_name}</h3><p className="mt-1 text-[9px] text-muted">{application.job_title}</p><div className="mt-3 flex flex-wrap gap-1">{application.declared_skills.slice(0, 3).map((skill) => <Tag key={skill}>{skill}</Tag>)}</div>{canManage && <form action={updateApplicationStage} className="mt-4 flex gap-2"><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="applicationId" value={application.id} /><select name="stage" defaultValue={stage} className="h-9 min-w-0 flex-1 rounded-lg border border-line px-2 text-[9px]">{stages.map((option) => <option key={option}>{option}</option>)}</select><AdminActionButton variant="secondary">Move</AdminActionButton></form>}</article>)}{!rows.length && <p className="px-2 py-8 text-center text-[9px] text-muted">No applications</p>}</div></section>; })}</div>;
}

function Screening({ jobs, runs, scores, organizationId, canRun }: { jobs: RecruitmentJob[]; runs: ScreeningRun[]; scores: RecruitmentScore[]; organizationId: string; canRun: boolean }) {
  const latest = runs.find((run) => run.status === "completed");
  return <div className="grid gap-5 xl:grid-cols-[360px_1fr]"><section id="run-screening" className="scroll-mt-24 rounded-2xl border border-line bg-white p-5 shadow-sm"><span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-700"><BrainCircuit size={20} /></span><h2 className="mt-4 text-base font-bold">Rank applications</h2><p className="mt-2 text-[10px] leading-5 text-muted">The model compares job content with résumé text and structured qualifications. Results support recruiter review; they do not make hiring decisions.</p>{canRun ? <form action={runApplicantScreening} className="mt-5 space-y-4"><input type="hidden" name="organizationId" value={organizationId} /><Select label="Job opening" name="jobId" options={jobs.map((job) => ({ value: job.id, label: `${job.reference} · ${job.title}` }))} /><AdminActionButton className="h-11 w-full"><Sparkles size={14} /> Run screening</AdminActionButton></form> : <p className="mt-5 rounded-xl border border-line bg-mist p-4 text-[10px] text-muted">Your role can review existing results but cannot start a screening run.</p>}<div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="text-[10px] font-bold text-blue-800">Responsible use</p><p className="mt-2 text-[9px] leading-5 text-blue-700">Identity attributes are excluded. A human must review evidence, accommodations, and job relevance before changing a hiring stage.</p></div></section><section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm"><div className="border-b border-line px-5 py-4"><h2 className="text-sm font-bold">Latest ranking</h2><p className="mt-1 text-[9px] text-muted">{latest ? `${latest.model_name} · version ${latest.model_version} · ${formatDate(latest.completed_at ?? latest.created_at)}` : "No completed screening run"}</p></div>{scores.length ? <div className="divide-y divide-line">{scores.map((score) => <article key={score.id} className="grid gap-4 p-5 lg:grid-cols-[44px_1fr_90px]"><span className="grid size-11 place-items-center rounded-xl bg-ink text-sm font-bold text-white">#{score.rank}</span><div><h3 className="text-sm font-bold">{score.applicant_name}</h3><p className="mt-1 text-[9px] text-muted">{score.job_title}</p><div className="mt-3 flex flex-wrap gap-1">{score.matched_skills.map((skill) => <Tag key={skill}>{skill}</Tag>)}{score.missing_skills.slice(0, 3).map((skill) => <span key={skill} className="rounded-full bg-red-50 px-2 py-1 text-[8px] text-red-700">Missing {skill}</span>)}</div><div className="mt-4 grid grid-cols-4 gap-2">{[["Semantic", score.semantic_score], ["Skills", score.skills_score], ["Experience", score.experience_score], ["Education", score.education_score]].map(([label, value]) => <div key={String(label)}><p className="text-[8px] text-muted">{label}</p><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-blue-50"><span className="block h-full rounded-full bg-blue-500" style={{ width: `${value}%` }} /></div><p className="mt-1 font-mono text-[8px]">{Number(value).toFixed(0)}</p></div>)}</div></div><div className="text-right"><strong className="text-2xl text-blue-700">{score.overall_score.toFixed(1)}</strong><p className="text-[8px] uppercase text-muted">fit score</p></div></article>)}</div> : <Empty text="Run screening to generate an explainable ranking." />}</section></div>;
}

function RecruitmentDrawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <><motion.button type="button" aria-label="Close form" onClick={onClose} className="fixed inset-0 z-[70] bg-ink/40 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /><motion.aside role="dialog" aria-modal="true" className="fixed inset-y-0 right-0 z-[80] flex w-full flex-col bg-[#f8faff] shadow-[-24px_0_70px_rgba(7,23,45,.18)] sm:max-w-[620px]" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 32 }}><div className="flex items-center gap-3 border-b border-line bg-white px-6 py-5"><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Plus size={17} /></span><h2 className="text-xl font-bold">{title}</h2><button type="button" onClick={onClose} className="ml-auto grid size-10 place-items-center rounded-xl border border-line"><X size={17} /></button></div>{children}</motion.aside></>; }

function JobForm({ organizationId }: { organizationId: string }) { return <form action={createJob} className="flex min-h-0 flex-1 flex-col"><div className="grid flex-1 content-start gap-5 overflow-y-auto p-6 sm:grid-cols-2"><input type="hidden" name="organizationId" value={organizationId} /><Field required label="Job reference" name="reference" placeholder="JOB-001" /><Field required label="Job title" name="title" placeholder="Supply Chain Analyst" /><Field required label="Department" name="department" placeholder="Operations" /><Field label="Location" name="location" placeholder="Manila / Hybrid" /><Select label="Employment type" name="employmentType" options={["full_time", "part_time", "contract", "temporary", "internship"].map(option)} /><Select label="Minimum education" name="educationLevel" options={["any", "high_school", "associate", "bachelor", "master", "doctorate"].map(option)} /><Field required label="Minimum experience (years)" name="minYearsExperience" type="number" min="0" max="60" step="0.5" defaultValue="0" /><Field label="Required skills · comma separated" name="requiredSkills" placeholder="inventory, forecasting, python" /><Field label="Preferred skills · comma separated" name="preferredSkills" placeholder="power bi, sql" className="sm:col-span-2" /><TextArea required label="Job description" name="description" placeholder="Describe responsibilities, outcomes, and job-relevant requirements..." /></div><FormFooter label="Create job opening" /></form>; }
function ApplicantForm({ organizationId, jobs }: { organizationId: string; jobs: RecruitmentJob[] }) { return <form action={createApplicant} className="flex min-h-0 flex-1 flex-col"><div className="grid flex-1 content-start gap-5 overflow-y-auto p-6 sm:grid-cols-2"><input type="hidden" name="organizationId" value={organizationId} /><Select label="Job opening" name="jobId" options={jobs.map((job) => ({ value: job.id, label: `${job.reference} · ${job.title}` }))} /><Field required label="Full name" name="fullName" /><Field required label="Email" name="email" type="email" /><Field label="Phone" name="phone" /><Field label="Location" name="location" /><Field required label="Source" name="source" defaultValue="direct" /><Field required label="Experience (years)" name="yearsExperience" type="number" min="0" max="60" step="0.5" defaultValue="0" /><Select label="Education" name="educationLevel" options={["any", "high_school", "associate", "bachelor", "master", "doctorate"].map(option)} /><Field label="Skills · comma separated" name="declaredSkills" className="sm:col-span-2" /><label className="sm:col-span-2"><span className={labelClass}>Résumé file · optional, max 10 MB</span><input type="file" name="resumeFile" accept=".pdf,.docx,.txt" className="block h-11 w-full rounded-xl border border-line bg-white text-[10px] file:mr-3 file:h-full file:border-0 file:border-r file:border-line file:bg-blue-50 file:px-3" /></label><TextArea required label="Résumé text for screening" name="resumeText" placeholder="Paste the applicant's résumé text. Identity details are minimized before model processing." /><label className="sm:col-span-2 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-[10px] leading-5 text-blue-800"><input required type="checkbox" name="screeningConsent" className="mt-1 size-4 accent-blue-600" /><span>I confirm the applicant has consented to storing this information and using job-related résumé content for assisted screening.</span></label></div><FormFooter label="Add applicant and application" /></form>; }

function Panel({ children }: { children: React.ReactNode }) { return <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_14px_40px_rgba(25,72,133,.055)]">{children}</section>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="border-b border-r border-line p-5"><p className="text-[10px] text-muted">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>; }
function TableHead({ labels }: { labels: string[] }) { return <thead><tr className="border-b border-line bg-[#f8faff] font-mono text-[8px] uppercase text-muted">{labels.map((label) => <th key={label} className="px-5 py-3 font-medium">{label}</th>)}</tr></thead>; }
function Field({ label, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) { return <label className={className}><span className={labelClass}>{label}</span><input className={fieldClass} {...props} /></label>; }
function TextArea({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) { return <label className="sm:col-span-2"><span className={labelClass}>{label}</span><textarea className="min-h-36 w-full resize-y rounded-xl border border-line bg-white p-3 text-xs outline-none focus:border-accent focus:ring-3 focus:ring-blue-100" {...props} /></label>; }
function Select({ label, name, options }: { label: string; name: string; options: Array<{ value: string; label: string }> }) { return <label><span className={labelClass}>{label}</span><select required name={name} className={fieldClass}><option value="">Select one</option>{options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>; }
function FormFooter({ label }: { label: string }) { return <div className="border-t border-line bg-white p-5"><AdminActionButton className="h-11 w-full">{label}</AdminActionButton><p className="mt-3 text-center text-[9px] text-muted">Applicant and hiring changes are recorded in the audit history.</p></div>; }
function Tag({ children }: { children: React.ReactNode }) { return <span className="rounded-full bg-blue-50 px-2 py-1 text-[8px] text-blue-700">{children}</span>; }
function Empty({ text }: { text: string }) { return <div className="grid min-h-56 place-items-center p-8 text-center"><div><FileText className="mx-auto text-blue-300" size={24} /><p className="mt-3 text-[10px] text-muted">{text}</p></div></div>; }
function AccessDenied({ role }: { role: string }) { return <div className="grid min-h-[calc(100vh-72px)] place-items-center p-6"><div className="max-w-md rounded-2xl border border-line bg-white p-8 text-center"><ShieldCheck className="mx-auto text-amber-600" size={28} /><h1 className="mt-4 text-xl font-bold">Recruitment access required</h1><p className="mt-3 text-sm text-muted">Your {humanize(role)} role cannot access applicant information. Ask an owner to assign Recruiter or HR Manager access.</p></div></div>; }
function option(value: string) { return { value, label: humanize(value) }; }
function humanize(value: string) { return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }
function formatDate(value: string) { return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(value)); }
function initials(value: string) { return value.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
