begin;

alter type public.organization_role add value if not exists 'hr_manager';
alter type public.organization_role add value if not exists 'recruiter';

commit;
