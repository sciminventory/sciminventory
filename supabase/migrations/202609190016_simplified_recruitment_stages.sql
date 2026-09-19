begin;

create type public.application_outcome as enum (
  'active', 'hired', 'rejected', 'withdrawn'
);

alter table public.job_applications
  add column outcome public.application_outcome not null default 'active';

-- Preserve closed historical applications separately from the simplified stage.
update public.job_applications
set outcome = case stage::text
  when 'hired' then 'hired'::public.application_outcome
  when 'rejected' then 'rejected'::public.application_outcome
  when 'withdrawn' then 'withdrawn'::public.application_outcome
  else 'active'::public.application_outcome
end;

alter table public.job_applications
  alter column stage drop default;

alter type public.application_stage rename to application_stage_legacy;

create type public.application_stage as enum (
  'applied', 'initial_review', 'ai_screening', 'interview', 'hired'
);

alter table public.job_applications
  alter column stage type public.application_stage
  using (
    case stage::text
      when 'applied' then 'applied'
      when 'screening' then 'ai_screening'
      when 'shortlisted' then 'interview'
      when 'interview' then 'interview'
      when 'offer' then 'interview'
      when 'hired' then 'hired'
      when 'rejected' then 'initial_review'
      when 'withdrawn' then 'initial_review'
      else 'applied'
    end
  )::public.application_stage;

alter table public.job_applications
  alter column stage set default 'applied'::public.application_stage;

drop type public.application_stage_legacy;

create index applications_outcome_idx
  on public.job_applications (organization_id, outcome, applied_at desc);

commit;
