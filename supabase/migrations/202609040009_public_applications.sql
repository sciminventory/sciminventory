begin;

alter table public.applicants
  alter column created_by drop not null;

alter table public.job_applications
  add column if not exists application_reference text,
  add column if not exists cover_letter text,
  add column if not exists submission_channel text not null default 'internal'
    check (submission_channel in ('internal', 'public'));

update public.job_applications
set application_reference = 'APP-' || upper(substr(replace(id::text, '-', ''), 1, 12))
where application_reference is null;

alter table public.job_applications
  alter column application_reference set default
    ('APP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  alter column application_reference set not null;

create unique index if not exists applications_reference_idx
  on public.job_applications (application_reference);

create table if not exists public.public_application_attempts (
  id uuid primary key default gen_random_uuid(),
  identifier_hash text not null check (char_length(identifier_hash) = 64),
  attempted_at timestamptz not null default now()
);

create index if not exists public_application_attempts_lookup_idx
  on public.public_application_attempts (identifier_hash, attempted_at desc);

alter table public.public_application_attempts enable row level security;
alter table public.public_application_attempts force row level security;
revoke all on public.public_application_attempts from anon, authenticated;
grant select, insert, delete on public.public_application_attempts to service_role;

commit;
