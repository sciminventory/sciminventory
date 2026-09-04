"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { hasPermission, type AppPermission } from "@/lib/auth/permissions";
import { requireMfaSession } from "@/lib/auth/require-mfa";
import type { Json } from "@/types/database";

const organizationIdSchema = z.uuid();
const jobSchema = z.object({
  organizationId: organizationIdSchema,
  reference: z.string().trim().min(2).max(40),
  title: z.string().trim().min(2).max(160),
  department: z.string().trim().min(2).max(100),
  location: z.string().trim().max(120),
  employmentType: z.enum(["full_time", "part_time", "contract", "temporary", "internship"]),
  description: z.string().trim().min(20).max(20_000),
  requiredSkills: z.string().max(2000),
  preferredSkills: z.string().max(2000),
  minYearsExperience: z.coerce.number().min(0).max(60),
  educationLevel: z.enum(["any", "high_school", "associate", "bachelor", "master", "doctorate"]),
});
const applicantSchema = z.object({
  organizationId: organizationIdSchema,
  jobId: z.uuid(),
  fullName: z.string().trim().min(2).max(160),
  email: z.email().transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(50),
  location: z.string().trim().max(120),
  source: z.string().trim().min(2).max(80),
  resumeText: z.string().trim().min(40).max(100_000),
  yearsExperience: z.coerce.number().min(0).max(60),
  educationLevel: z.enum(["any", "high_school", "associate", "bachelor", "master", "doctorate"]),
  declaredSkills: z.string().max(4000),
  screeningConsent: z.literal("on"),
});
const stageSchema = z.object({
  organizationId: organizationIdSchema,
  applicationId: z.uuid(),
  stage: z.enum(["applied", "screening", "shortlisted", "interview", "offer", "hired", "rejected", "withdrawn"]),
});

type Section = "jobs" | "applicants" | "pipeline" | "screening";
function go(section: Section, message: string, tone: "success" | "error" = "success"): never {
  redirect(`/dashboard/recruitment/${section}?${tone}=${encodeURIComponent(message)}`);
}

async function requireRecruitment(organizationId: string, section: Section, permission: AppPermission) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership } = await supabase.from("organization_memberships").select("role").eq("organization_id", organizationId).eq("user_id", user.id).eq("status", "active").maybeSingle();
  if (!membership || !hasPermission(membership.role, permission)) go(section, "Your role does not have permission to perform this action.", "error");
  await requireMfaSession(supabase);
  return { supabase, user };
}

function skills(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean))].slice(0, 100);
}

function refreshRecruitment() {
  revalidatePath("/dashboard/recruitment", "layout");
  revalidatePath("/careers");
}

export async function createJob(formData: FormData) {
  const result = jobSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) go("jobs", result.error.issues[0]?.message ?? "Check the job details.", "error");
  const data = result.data;
  const { supabase, user } = await requireRecruitment(data.organizationId, "jobs", "recruitment.jobs.manage");
  const { error } = await supabase.from("job_openings").insert({
    organization_id: data.organizationId,
    reference: data.reference.toUpperCase(),
    title: data.title,
    department: data.department,
    location: data.location || null,
    employment_type: data.employmentType,
    status: "draft",
    description: data.description,
    required_skills: skills(data.requiredSkills),
    preferred_skills: skills(data.preferredSkills),
    min_years_experience: data.minYearsExperience,
    education_level: data.educationLevel,
    created_by: user.id,
  });
  if (error) go("jobs", error.message, "error");
  refreshRecruitment();
  go("jobs", "Job opening created.");
}

export async function updateJobStatus(formData: FormData) {
  const parsed = z.object({ organizationId: z.uuid(), jobId: z.uuid(), status: z.enum(["draft", "open", "paused", "closed", "archived"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) go("jobs", "Select a valid job status.", "error");
  const { supabase } = await requireRecruitment(parsed.data.organizationId, "jobs", "recruitment.jobs.manage");
  const now = new Date().toISOString();
  const { error } = await supabase.from("job_openings").update({
    status: parsed.data.status,
    opened_at: parsed.data.status === "open" ? now : undefined,
    closed_at: parsed.data.status === "closed" ? now : undefined,
  }).eq("organization_id", parsed.data.organizationId).eq("id", parsed.data.jobId);
  if (error) go("jobs", error.message, "error");
  refreshRecruitment();
  go("jobs", "Job status updated.");
}

export async function createApplicant(formData: FormData) {
  const result = applicantSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) go("applicants", result.error.issues[0]?.message ?? "Check the applicant details.", "error");
  const data = result.data;
  const { supabase, user } = await requireRecruitment(data.organizationId, "applicants", "recruitment.applicants.manage");
  let applicantId: string;
  const existing = await supabase.from("applicants").select("id").eq("organization_id", data.organizationId).eq("email", data.email).maybeSingle();
  if (existing.data) applicantId = existing.data.id;
  else {
    const inserted = await supabase.from("applicants").insert({ organization_id: data.organizationId, full_name: data.fullName, email: data.email, phone: data.phone || null, location: data.location || null, source: data.source, created_by: user.id }).select("id").single();
    if (inserted.error || !inserted.data) go("applicants", inserted.error?.message ?? "Applicant could not be created.", "error");
    applicantId = inserted.data.id;
  }

  const applicationId = crypto.randomUUID();
  let resumePath: string | null = null;
  let resumeName: string | null = null;
  const file = formData.get("resumeFile");
  if (file instanceof File && file.size > 0) {
    if (file.size > 10 * 1024 * 1024) go("applicants", "Résumé files must be 10 MB or smaller.", "error");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120);
    resumePath = `${data.organizationId}/applications/${applicationId}/${crypto.randomUUID()}-${safeName}`;
    const upload = await supabase.storage.from("recruitment-documents").upload(resumePath, file, { contentType: file.type || "application/octet-stream" });
    if (upload.error) go("applicants", upload.error.message, "error");
    resumeName = file.name;
  }
  const application = await supabase.from("job_applications").insert({
    id: applicationId,
    organization_id: data.organizationId,
    job_id: data.jobId,
    applicant_id: applicantId,
    resume_text: data.resumeText,
    resume_storage_path: resumePath,
    resume_file_name: resumeName,
    years_experience: data.yearsExperience,
    education_level: data.educationLevel,
    declared_skills: skills(data.declaredSkills),
    screening_consent_at: new Date().toISOString(),
  });
  if (application.error) go("applicants", application.error.message, "error");
  refreshRecruitment();
  go("applicants", "Applicant and application created.");
}

export async function updateApplicationStage(formData: FormData) {
  const result = stageSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) go("pipeline", "Select a valid hiring stage.", "error");
  const { supabase } = await requireRecruitment(result.data.organizationId, "pipeline", "recruitment.pipeline.manage");
  const { error } = await supabase.from("job_applications").update({ stage: result.data.stage }).eq("organization_id", result.data.organizationId).eq("id", result.data.applicationId);
  if (error) go("pipeline", error.message, "error");
  refreshRecruitment();
  go("pipeline", "Application stage updated.");
}

export async function downloadRecruitmentResume(formData: FormData) {
  const result = z.object({ organizationId: z.uuid(), applicationId: z.uuid() }).safeParse(Object.fromEntries(formData));
  if (!result.success) go("applicants", "Invalid résumé reference.", "error");
  const { supabase } = await requireRecruitment(result.data.organizationId, "applicants", "recruitment.read");
  const { data: application, error } = await supabase
    .from("job_applications")
    .select("resume_storage_path")
    .eq("organization_id", result.data.organizationId)
    .eq("id", result.data.applicationId)
    .single();
  if (error || !application?.resume_storage_path) go("applicants", error?.message ?? "This application has no uploaded résumé.", "error");
  const signed = await supabase.storage.from("recruitment-documents").createSignedUrl(application.resume_storage_path, 60);
  if (signed.error) go("applicants", signed.error.message, "error");
  redirect(signed.data.signedUrl);
}

export async function runApplicantScreening(formData: FormData) {
  const result = z.object({ organizationId: z.uuid(), jobId: z.uuid() }).safeParse(Object.fromEntries(formData));
  if (!result.success) go("screening", "Select a valid job opening.", "error");
  const { supabase, user } = await requireRecruitment(result.data.organizationId, "screening", "recruitment.screening.run");
  const [jobResult, applicationsResult, applicantsResult] = await Promise.all([
    supabase.from("job_openings").select("id, title, description, required_skills, preferred_skills, min_years_experience, education_level").eq("organization_id", result.data.organizationId).eq("id", result.data.jobId).single(),
    supabase.from("job_applications").select("id, applicant_id, resume_text, declared_skills, years_experience, education_level").eq("organization_id", result.data.organizationId).eq("job_id", result.data.jobId).not("screening_consent_at", "is", null).not("stage", "in", "(rejected,withdrawn)"),
    supabase.from("applicants").select("id, full_name").eq("organization_id", result.data.organizationId),
  ]);
  if (jobResult.error || !jobResult.data) go("screening", "Job opening was not found.", "error");
  if (applicationsResult.error || !applicationsResult.data?.length) go("screening", "Add at least one active application before screening.", "error");

  const run = await supabase.from("screening_runs").insert({ organization_id: result.data.organizationId, job_id: result.data.jobId, status: "processing", model_version: "pending", application_count: applicationsResult.data.length, created_by: user.id }).select("id").single();
  if (run.error || !run.data) go("screening", run.error?.message ?? "Screening run could not start.", "error");

  try {
    const serviceUrl = process.env.SCREENING_SERVICE_URL ?? "http://127.0.0.1:8000";
    const serviceKey = process.env.SCREENING_SERVICE_API_KEY;
    const applicantNames = new Map((applicantsResult.data ?? []).map((applicant) => [applicant.id, applicant.full_name]));
    const response = await fetch(`${serviceUrl.replace(/\/$/, "")}/v1/rank`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(serviceKey ? { "x-screening-key": serviceKey } : {}) },
      body: JSON.stringify({
        job: jobResult.data,
        applications: applicationsResult.data.map((application) => ({ application_id: application.id, resume_text: redactResume(application.resume_text, applicantNames.get(application.applicant_id)), declared_skills: application.declared_skills, years_experience: application.years_experience, education_level: application.education_level })),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Screening service returned ${response.status}.`);
    const payload = screeningResponseSchema.parse(await response.json());
    const scores = payload.rankings.map((score) => ({
      organization_id: result.data.organizationId,
      screening_run_id: run.data.id,
      application_id: score.application_id,
      rank: score.rank,
      overall_score: score.overall_score,
      semantic_score: score.semantic_score,
      skills_score: score.skills_score,
      experience_score: score.experience_score,
      education_score: score.education_score,
      matched_skills: score.matched_skills,
      missing_skills: score.missing_skills,
      explanation: score.explanation as Json,
    }));
    const scoreInsert = await supabase.from("screening_scores").insert(scores);
    if (scoreInsert.error) throw new Error(scoreInsert.error.message);
    await supabase.from("screening_runs").update({ status: "completed", model_name: payload.model_name, model_version: payload.model_version, weights: payload.weights as Json, completed_at: new Date().toISOString() }).eq("id", run.data.id);
    await supabase.from("job_applications").update({ stage: "screening" }).eq("organization_id", result.data.organizationId).eq("job_id", result.data.jobId).eq("stage", "applied");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Screening service is unavailable.";
    await supabase.from("screening_runs").update({ status: "failed", error_message: message, completed_at: new Date().toISOString() }).eq("id", run.data.id);
    go("screening", `${message} Start the Python screening service and try again.`, "error");
  }
  refreshRecruitment();
  go("screening", `Ranked ${applicationsResult.data.length} applications.`);
}

const screeningResponseSchema = z.object({
  model_name: z.string(),
  model_version: z.string(),
  weights: z.record(z.string(), z.number()),
  rankings: z.array(z.object({
    application_id: z.uuid(), rank: z.number().int().positive(), overall_score: z.number(),
    semantic_score: z.number(), skills_score: z.number(), experience_score: z.number(),
    education_score: z.number(), matched_skills: z.array(z.string()), missing_skills: z.array(z.string()),
    explanation: z.record(z.string(), z.string()),
  })),
});

function redactResume(value: string, fullName?: string) {
  let redacted = value
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, " [email removed] ")
    .replace(/https?:\/\/\S+|www\.\S+/gi, " [link removed] ")
    .replace(/(?:\+?\d[\d ()-]{7,}\d)/g, " [phone removed] ")
    .replace(/^\s*(?:name|age|date of birth|birth date|gender|sex|nationality|ethnicity|religion|marital status|disability|address)\s*[:|-].*$/gim, " [identity field removed] ");
  if (fullName?.trim()) {
    redacted = redacted.replace(new RegExp(escapeRegExp(fullName.trim()), "gi"), " [name removed] ");
  }
  return redacted.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
