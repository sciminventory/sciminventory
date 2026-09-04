import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { RecruitmentConsole, type RecruitmentApplicant, type RecruitmentApplication, type RecruitmentJob, type RecruitmentScore, type ScreeningRun } from "@/components/operations/recruitment-console";
import { hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Recruitment" };

const sectionSchema = z.enum(["jobs", "applicants", "pipeline", "screening"]);

export default async function RecruitmentPage({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<{ success?: string; error?: string; create?: string }> }) {
  const [{ section: rawSection }, search] = await Promise.all([params, searchParams]);
  const parsedSection = sectionSchema.safeParse(rawSection);
  if (!parsedSection.success) notFound();
  const section = parsedSection.data;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership } = await supabase.from("organization_memberships").select("organization_id, role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!membership) redirect("/dashboard");
  const allowed = hasPermission(membership.role, "recruitment.read");
  if (!allowed) return <RecruitmentConsole section={section} organizationId={membership.organization_id} role={membership.role} jobs={[]} applicants={[]} applications={[]} runs={[]} scores={[]} accessDenied />;

  const organizationId = membership.organization_id;
  const [jobsResult, applicantsResult, applicationsResult, runsResult] = await Promise.all([
    supabase.from("job_openings").select("id, reference, title, department, location, employment_type, status, required_skills, preferred_skills, min_years_experience, education_level, created_at").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    supabase.from("applicants").select("id, full_name, email, phone, location, source, created_at").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    supabase.from("job_applications").select("id, job_id, applicant_id, application_reference, submission_channel, stage, years_experience, education_level, declared_skills, resume_file_name, screening_consent_at, applied_at").eq("organization_id", organizationId).order("applied_at", { ascending: false }),
    supabase.from("screening_runs").select("id, job_id, status, model_name, model_version, application_count, error_message, created_at, completed_at").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(25),
  ]);
  const setupError = [jobsResult, applicantsResult, applicationsResult, runsResult].find((result) => result.error)?.error;
  const jobs: RecruitmentJob[] = (jobsResult.data ?? []).map((job) => ({ ...job, min_years_experience: Number(job.min_years_experience) }));
  const applicants: RecruitmentApplicant[] = applicantsResult.data ?? [];
  const jobNames = new Map(jobs.map((job) => [job.id, job.title]));
  const applicantNames = new Map(applicants.map((applicant) => [applicant.id, applicant.full_name]));
  const applications: RecruitmentApplication[] = (applicationsResult.data ?? []).map((application) => ({ ...application, years_experience: Number(application.years_experience), job_title: jobNames.get(application.job_id) ?? "Unknown job", applicant_name: applicantNames.get(application.applicant_id) ?? "Unknown applicant" }));
  const runs: ScreeningRun[] = runsResult.data ?? [];
  const latestCompletedRun = runs.find((run) => run.status === "completed");
  const scoresResult = latestCompletedRun ? await supabase.from("screening_scores").select("id, screening_run_id, application_id, rank, overall_score, semantic_score, skills_score, experience_score, education_score, matched_skills, missing_skills, explanation").eq("organization_id", organizationId).eq("screening_run_id", latestCompletedRun.id).order("rank") : { data: [], error: null };
  const applicationMap = new Map(applications.map((application) => [application.id, application]));
  const scores: RecruitmentScore[] = (scoresResult.data ?? []).map((score) => ({ ...score, overall_score: Number(score.overall_score), semantic_score: Number(score.semantic_score), skills_score: Number(score.skills_score), experience_score: Number(score.experience_score), education_score: Number(score.education_score), applicant_name: applicationMap.get(score.application_id)?.applicant_name ?? "Unknown applicant", job_title: applicationMap.get(score.application_id)?.job_title ?? "Unknown job" }));

  const setupMessage = setupError
    ? setupError.code === "PGRST205" || setupError.code === "42P01"
      ? "Recruitment tables are not installed. Apply migration 005 first, then apply 006, 007, and 008 in order."
      : `Recruitment database error: ${setupError.message}`
    : undefined;
  return <RecruitmentConsole section={section} organizationId={organizationId} role={membership.role} jobs={jobs} applicants={applicants} applications={applications} runs={runs} scores={scores} success={search.success} error={search.error} setupError={setupMessage} openCreate={search.create === "1"} canManageJobs={hasPermission(membership.role, "recruitment.jobs.manage")} canManageApplicants={hasPermission(membership.role, "recruitment.applicants.manage")} canManagePipeline={hasPermission(membership.role, "recruitment.pipeline.manage")} canRunScreening={hasPermission(membership.role, "recruitment.screening.run")} />;
}
