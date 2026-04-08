-- Add shortlist flag per application (per role)
alter table if exists public.applications
  add column if not exists shortlisted boolean not null default false;

create index if not exists applications_shortlisted_idx on public.applications (shortlisted);

