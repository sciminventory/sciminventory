begin;

create type public.job_status as enum ('draft', 'open', 'paused', 'closed', 'archived');
create type public.application_stage as enum (
  'applied', 'screening', 'shortlisted', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'
);
create type public.screening_run_status as enum ('processing', 'completed', 'failed');

create table public.job_openings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reference text not null check (char_length(trim(reference)) between 2 and 40),
  title text not null check (char_length(trim(title)) between 2 and 160),
  department text not null check (char_length(trim(department)) between 2 and 100),
  location text,
  employment_type text not null default 'full_time'
    check (employment_type in ('full_time', 'part_time', 'contract', 'temporary', 'internship')),
  status public.job_status not null default 'draft',
  description text not null check (char_length(trim(description)) between 20 and 20000),
  required_skills text[] not null default '{}',
  preferred_skills text[] not null default '{}',
  min_years_experience numeric(4, 1) not null default 0 check (min_years_experience between 0 and 60),
  education_level text not null default 'any'
    check (education_level in ('any', 'high_school', 'associate', 'bachelor', 'master', 'doctorate')),
  created_by uuid not null references auth.users(id) on delete restrict,
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, reference),
  unique (organization_id, id)
);

create table public.applicants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  email text not null check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  phone text,
  location text,
  source text not null default 'direct',
  consent_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email),
  unique (organization_id, id)
);

create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  job_id uuid not null,
  applicant_id uuid not null,
  stage public.application_stage not null default 'applied',
  resume_text text not null check (char_length(trim(resume_text)) between 40 and 100000),
  resume_storage_path text,
  resume_file_name text,
  years_experience numeric(4, 1) not null default 0 check (years_experience between 0 and 60),
  education_level text not null default 'any'
    check (education_level in ('any', 'high_school', 'associate', 'bachelor', 'master', 'doctorate')),
  declared_skills text[] not null default '{}',
  recruiter_notes text,
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, job_id)
    references public.job_openings(organization_id, id) on delete restrict,
  foreign key (organization_id, applicant_id)
    references public.applicants(organization_id, id) on delete restrict,
  unique (organization_id, job_id, applicant_id),
  unique (organization_id, id)
);

create table public.screening_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  job_id uuid not null,
  status public.screening_run_status not null default 'processing',
  model_name text not null default 'tfidf-hybrid-ranker',
  model_version text not null,
  weights jsonb not null default '{}'::jsonb,
  application_count integer not null default 0 check (application_count >= 0),
  error_message text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  foreign key (organization_id, job_id)
    references public.job_openings(organization_id, id) on delete restrict,
  unique (organization_id, id)
);

create table public.screening_scores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  screening_run_id uuid not null,
  application_id uuid not null,
  rank integer not null check (rank > 0),
  overall_score numeric(5, 2) not null check (overall_score between 0 and 100),
  semantic_score numeric(5, 2) not null check (semantic_score between 0 and 100),
  skills_score numeric(5, 2) not null check (skills_score between 0 and 100),
  experience_score numeric(5, 2) not null check (experience_score between 0 and 100),
  education_score numeric(5, 2) not null check (education_score between 0 and 100),
  matched_skills text[] not null default '{}',
  missing_skills text[] not null default '{}',
  explanation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (organization_id, screening_run_id)
    references public.screening_runs(organization_id, id) on delete cascade,
  foreign key (organization_id, application_id)
    references public.job_applications(organization_id, id) on delete restrict,
  unique (screening_run_id, application_id)
);

create index jobs_organization_status_idx on public.job_openings (organization_id, status, created_at desc);
create index applicants_organization_name_idx on public.applicants (organization_id, full_name);
create index applications_job_stage_idx on public.job_applications (organization_id, job_id, stage, applied_at desc);
create index applications_applicant_idx on public.job_applications (organization_id, applicant_id);
create index screening_runs_job_idx on public.screening_runs (organization_id, job_id, created_at desc);
create index screening_scores_run_rank_idx on public.screening_scores (screening_run_id, rank);

create trigger job_openings_set_updated_at before update on public.job_openings
for each row execute function public.set_updated_at();
create trigger applicants_set_updated_at before update on public.applicants
for each row execute function public.set_updated_at();
create trigger job_applications_set_updated_at before update on public.job_applications
for each row execute function public.set_updated_at();

create trigger job_openings_audit after insert or update or delete on public.job_openings
for each row execute function public.audit_operational_change();
create trigger applicants_audit after insert or update or delete on public.applicants
for each row execute function public.audit_operational_change();
create trigger job_applications_audit after insert or update or delete on public.job_applications
for each row execute function public.audit_operational_change();
create trigger screening_runs_audit after insert or update or delete on public.screening_runs
for each row execute function public.audit_operational_change();

alter table public.job_openings enable row level security;
alter table public.applicants enable row level security;
alter table public.job_applications enable row level security;
alter table public.screening_runs enable row level security;
alter table public.screening_scores enable row level security;
alter table public.job_openings force row level security;
alter table public.applicants force row level security;
alter table public.job_applications force row level security;
alter table public.screening_runs force row level security;
alter table public.screening_scores force row level security;

create policy "jobs_recruitment_access" on public.job_openings
for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin','hr_manager','recruiter']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','hr_manager','recruiter']::public.organization_role[]));
create policy "applicants_recruitment_access" on public.applicants
for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin','hr_manager','recruiter']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','hr_manager','recruiter']::public.organization_role[]));
create policy "applications_recruitment_access" on public.job_applications
for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin','hr_manager','recruiter']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','hr_manager','recruiter']::public.organization_role[]));
create policy "screening_runs_recruitment_access" on public.screening_runs
for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin','hr_manager','recruiter']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','hr_manager','recruiter']::public.organization_role[]));
create policy "screening_scores_recruitment_access" on public.screening_scores
for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin','hr_manager','recruiter']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','hr_manager','recruiter']::public.organization_role[]));

grant select, insert, update on public.job_openings, public.applicants,
  public.job_applications, public.screening_runs, public.screening_scores to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recruitment-documents',
  'recruitment-documents',
  false,
  10485760,
  array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "recruitment_files_select" on storage.objects
for select to authenticated using (
  bucket_id = 'recruitment-documents'
  and public.has_org_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner','admin','hr_manager','recruiter']::public.organization_role[]
  )
);
create policy "recruitment_files_insert" on storage.objects
for insert to authenticated with check (
  bucket_id = 'recruitment-documents'
  and owner_id = auth.uid()::text
  and public.has_org_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner','admin','hr_manager','recruiter']::public.organization_role[]
  )
);
create policy "recruitment_files_delete" on storage.objects
for delete to authenticated using (
  bucket_id = 'recruitment-documents'
  and public.has_org_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner','admin','hr_manager']::public.organization_role[]
  )
);

commit;
