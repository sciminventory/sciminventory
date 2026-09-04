begin;

alter table public.job_applications
  add column if not exists screening_consent_at timestamptz;

commit;
