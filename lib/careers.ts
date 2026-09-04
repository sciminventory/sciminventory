import "server-only";

import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";

export type PublicJob = {
  id: string;
  organization_id: string;
  organization_name: string;
  reference: string;
  title: string;
  department: string;
  location: string | null;
  employment_type: string;
  description: string;
  required_skills: string[];
  preferred_skills: string[];
  min_years_experience: number;
  education_level: string;
  opened_at: string | null;
};

const jobFields = "id, organization_id, reference, title, department, location, employment_type, description, required_skills, preferred_skills, min_years_experience, education_level, opened_at" as const;

export async function loadOpenJobs(): Promise<{ jobs: PublicJob[]; available: boolean }> {
  if (!hasSupabaseAdminEnv()) return { jobs: [], available: false };
  const admin = createAdminClient();
  const jobsResult = await admin.from("job_openings").select(jobFields).eq("status", "open").order("opened_at", { ascending: false });
  if (jobsResult.error) return { jobs: [], available: false };
  const rows = jobsResult.data ?? [];
  const organizationIds = [...new Set(rows.map((job) => job.organization_id))];
  const organizationsResult = organizationIds.length
    ? await admin.from("organizations").select("id, name").in("id", organizationIds)
    : { data: [], error: null };
  const organizations = new Map((organizationsResult.data ?? []).map((organization) => [organization.id, organization.name]));
  return {
    available: !organizationsResult.error,
    jobs: rows.map((job) => ({
      ...job,
      min_years_experience: Number(job.min_years_experience),
      organization_name: organizations.get(job.organization_id) ?? "Hiring team",
    })),
  };
}

export async function loadOpenJob(jobId: string): Promise<PublicJob | null> {
  if (!hasSupabaseAdminEnv()) return null;
  const admin = createAdminClient();
  const jobResult = await admin.from("job_openings").select(jobFields).eq("id", jobId).eq("status", "open").maybeSingle();
  if (jobResult.error || !jobResult.data) return null;
  const organization = await admin.from("organizations").select("name").eq("id", jobResult.data.organization_id).maybeSingle();
  return {
    ...jobResult.data,
    min_years_experience: Number(jobResult.data.min_years_experience),
    organization_name: organization.data?.name ?? "Hiring team",
  };
}
