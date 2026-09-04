"use server";

import { createHash, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";
import { validateResumeFile } from "@/lib/recruitment/resume-files";

export type PublicApplicationState = {
  status: "idle" | "error" | "success";
  message: string;
  reference?: string;
};

const applicationSchema = z.object({
  jobId: z.uuid(),
  organizationId: z.uuid(),
  fullName: z.string().trim().min(2).max(160),
  email: z.email().transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(50),
  location: z.string().trim().max(120),
  yearsExperience: z.coerce.number().min(0).max(60),
  educationLevel: z.enum(["any", "high_school", "associate", "bachelor", "master", "doctorate"]),
  declaredSkills: z.string().trim().max(4000),
  resumeText: z.string().trim().min(80).max(100_000),
  coverLetter: z.string().trim().max(10_000),
  consent: z.literal("on"),
  website: z.string().max(0),
});

export async function submitPublicApplication(
  _previousState: PublicApplicationState,
  formData: FormData,
): Promise<PublicApplicationState> {
  const parsed = applicationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Please check your application details." };
  }
  if (!hasSupabaseAdminEnv()) {
    return { status: "error", message: "Applications are temporarily unavailable. Please contact the hiring team." };
  }

  const data = parsed.data;
  const admin = createAdminClient();
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientAddress = forwarded || requestHeaders.get("x-real-ip") || "unknown";
  const rateSalt = process.env.PUBLIC_APPLICATION_RATE_LIMIT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "local-development";
  const identifierHash = createHash("sha256").update(`${rateSalt}|${clientAddress}|${data.email}`).digest("hex");
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const attempts = await admin
    .from("public_application_attempts")
    .select("id", { count: "exact", head: true })
    .eq("identifier_hash", identifierHash)
    .gte("attempted_at", oneHourAgo);
  if (attempts.error) {
    return { status: "error", message: "The public application database update is not installed yet." };
  }
  if ((attempts.count ?? 0) >= 5) {
    return { status: "error", message: "Too many application attempts. Please try again in one hour." };
  }
  await admin.from("public_application_attempts").insert({ identifier_hash: identifierHash });
  await admin.from("public_application_attempts").delete().lt("attempted_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const job = await admin
    .from("job_openings")
    .select("id, organization_id, status")
    .eq("id", data.jobId)
    .eq("organization_id", data.organizationId)
    .eq("status", "open")
    .maybeSingle();
  if (job.error || !job.data) {
    return { status: "error", message: "This position is no longer accepting applications." };
  }

  let applicantId: string;
  let createdApplicant = false;
  const existingApplicant = await admin
    .from("applicants")
    .select("id")
    .eq("organization_id", data.organizationId)
    .eq("email", data.email)
    .maybeSingle();
  if (existingApplicant.error) return { status: "error", message: "Your application could not be processed. Please try again." };
  if (existingApplicant.data) {
    applicantId = existingApplicant.data.id;
    const duplicate = await admin
      .from("job_applications")
      .select("application_reference")
      .eq("organization_id", data.organizationId)
      .eq("job_id", data.jobId)
      .eq("applicant_id", applicantId)
      .maybeSingle();
    if (duplicate.data) {
      return { status: "success", message: "We already received your application for this position.", reference: duplicate.data.application_reference };
    }
  } else {
    const inserted = await admin
      .from("applicants")
      .insert({
        organization_id: data.organizationId,
        full_name: data.fullName,
        email: data.email,
        phone: data.phone || null,
        location: data.location || null,
        source: "career_portal",
        consent_at: new Date().toISOString(),
        created_by: null,
      })
      .select("id")
      .single();
    if (inserted.error || !inserted.data) return { status: "error", message: "Your application could not be processed. Please try again." };
    applicantId = inserted.data.id;
    createdApplicant = true;
  }

  const applicationId = randomUUID();
  const applicationReference = `APP-${applicationId.replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  let resumePath: string | null = null;
  let resumeName: string | null = null;
  const file = formData.get("resumeFile");
  if (file instanceof File && file.size > 0) {
    const validation = await validateResumeFile(file);
    if (!validation.ok) {
      if (createdApplicant) await admin.from("applicants").delete().eq("id", applicantId);
      return { status: "error", message: validation.message };
    }
    resumePath = `${data.organizationId}/applications/${applicationId}/${randomUUID()}-${validation.safeName}`;
    const upload = await admin.storage.from("recruitment-documents").upload(resumePath, file, { contentType: validation.contentType, upsert: false });
    if (upload.error) {
      if (createdApplicant) await admin.from("applicants").delete().eq("id", applicantId);
      return { status: "error", message: "The resume file could not be uploaded. Please try again." };
    }
    resumeName = file.name;
  }

  const insertedApplication = await admin.from("job_applications").insert({
    id: applicationId,
    organization_id: data.organizationId,
    job_id: data.jobId,
    applicant_id: applicantId,
    application_reference: applicationReference,
    cover_letter: data.coverLetter || null,
    submission_channel: "public",
    resume_text: data.resumeText,
    resume_storage_path: resumePath,
    resume_file_name: resumeName,
    years_experience: data.yearsExperience,
    education_level: data.educationLevel,
    declared_skills: splitSkills(data.declaredSkills),
    screening_consent_at: new Date().toISOString(),
  });
  if (insertedApplication.error) {
    if (resumePath) await admin.storage.from("recruitment-documents").remove([resumePath]);
    if (createdApplicant) await admin.from("applicants").delete().eq("id", applicantId);
    return { status: "error", message: "Your application could not be submitted. Please try again." };
  }

  revalidatePath("/careers");
  revalidatePath("/dashboard/recruitment", "layout");
  return { status: "success", message: "Your application has been received.", reference: applicationReference };
}

function splitSkills(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean))].slice(0, 100);
}
