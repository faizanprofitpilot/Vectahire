-- VectaHire initial schema (run in Supabase SQL editor or via CLI)

create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type subscription_tier as enum ('free', 'starter', 'pro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_seniority as enum ('intern', 'junior', 'mid', 'senior', 'lead', 'executive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type application_status as enum ('invited', 'in_progress', 'completed', 'withdrawn');
exception when duplicate_object then null; end $$;

do $$ begin
  create type session_status as enum ('pending', 'in_progress', 'completed', 'abandoned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type scoring_status as enum ('pending', 'processing', 'completed', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type final_verdict as enum ('strong_hire', 'hire', 'maybe', 'no_hire');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('active', 'canceled', 'past_due', 'trialing');
exception when duplicate_object then null; end $$;

-- Employers
create table if not exists public.employers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company_name text not null default '',
  full_name text not null default '',
  email text not null,
  subscription_tier subscription_tier not null default 'free',
  onboarding_completed boolean not null default false,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists employers_user_id_idx on public.employers (user_id);

-- Jobs
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.employers (id) on delete cascade,
  title text not null,
  description text not null default '',
  required_skills jsonb not null default '[]'::jsonb,
  seniority job_seniority not null default 'mid',
  location text not null default '',
  salary_min integer,
  salary_max integer,
  salary_currency text not null default 'USD',
  hiring_priorities text,
  interview_focus jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_employer_id_idx on public.jobs (employer_id);

-- Candidates (scoped per employer for RLS)
create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.employers (id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists candidates_employer_email_lower_idx
  on public.candidates (employer_id, lower(email));

create index if not exists candidates_employer_id_idx on public.candidates (employer_id);

-- Applications
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  stage text not null default 'screening',
  status application_status not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, candidate_id)
);

create index if not exists applications_job_id_idx on public.applications (job_id);
create index if not exists applications_candidate_id_idx on public.applications (candidate_id);

-- Interview sessions
create table if not exists public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  status session_status not null default 'pending',
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  video_storage_path text,
  transcript_complete boolean not null default false,
  scoring_status scoring_status not null default 'pending',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists interview_sessions_application_id_idx on public.interview_sessions (application_id);
create index if not exists interview_sessions_status_idx on public.interview_sessions (status);

-- Transcripts
create table if not exists public.interview_transcripts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions (id) on delete cascade,
  sequence integer not null,
  question_text text not null,
  answer_text text not null default '',
  asked_at timestamptz not null default now(),
  answered_at timestamptz,
  stt_confidence numeric,
  is_follow_up boolean not null default false,
  created_at timestamptz not null default now(),
  unique (session_id, sequence)
);

create index if not exists interview_transcripts_session_id_idx on public.interview_transcripts (session_id);

-- Scores
create table if not exists public.interview_scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions (id) on delete cascade,
  overall_score integer not null,
  communication_score integer not null,
  role_fit_score integer not null,
  problem_solving_score integer not null,
  experience_score integer not null,
  confidence_score integer not null,
  strengths text[] not null default array[]::text[],
  weaknesses text[] not null default array[]::text[],
  risks text[] not null default array[]::text[],
  summary text not null,
  final_verdict final_verdict not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id)
);

-- Rankings per job
create table if not exists public.job_candidate_rankings (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  rank integer not null,
  overall_score integer not null,
  comparison_blurb text,
  updated_at timestamptz not null default now(),
  unique (job_id, application_id)
);

create index if not exists job_candidate_rankings_job_id_idx on public.job_candidate_rankings (job_id);

-- Subscriptions (Stripe-ready)
create table if not exists public.employer_subscriptions (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.employers (id) on delete cascade,
  tier subscription_tier not null default 'free',
  status subscription_status not null default 'active',
  stripe_subscription_id text,
  stripe_price_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employer_id)
);

-- Usage (monthly)
create table if not exists public.employer_usage (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.employers (id) on delete cascade,
  period_start date not null,
  interviews_count integer not null default 0,
  invites_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employer_id, period_start)
);

-- RLS
alter table public.employers enable row level security;
alter table public.jobs enable row level security;
alter table public.candidates enable row level security;
alter table public.applications enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.interview_transcripts enable row level security;
alter table public.interview_scores enable row level security;
alter table public.job_candidate_rankings enable row level security;
alter table public.employer_subscriptions enable row level security;
alter table public.employer_usage enable row level security;

create or replace function public.current_employer_id() returns uuid
language sql stable security definer
set search_path = public
as $$
  select id from public.employers where user_id = auth.uid() limit 1;
$$;

-- Employers: own row only
drop policy if exists employers_select_own on public.employers;
create policy employers_select_own on public.employers for select using (user_id = auth.uid());
drop policy if exists employers_update_own on public.employers;
create policy employers_update_own on public.employers for update using (user_id = auth.uid());
drop policy if exists employers_insert_own on public.employers;
create policy employers_insert_own on public.employers for insert with check (user_id = auth.uid());

-- Jobs
drop policy if exists jobs_all on public.jobs;
create policy jobs_all on public.jobs for all using (employer_id = public.current_employer_id())
  with check (employer_id = public.current_employer_id());

-- Candidates
drop policy if exists candidates_all on public.candidates;
create policy candidates_all on public.candidates for all using (employer_id = public.current_employer_id())
  with check (employer_id = public.current_employer_id());

-- Applications (via job ownership)
drop policy if exists applications_all on public.applications;
create policy applications_all on public.applications for all using (
  exists (select 1 from public.jobs j where j.id = job_id and j.employer_id = public.current_employer_id())
) with check (
  exists (select 1 from public.jobs j where j.id = job_id and j.employer_id = public.current_employer_id())
);

-- Sessions (via application -> job)
drop policy if exists interview_sessions_all on public.interview_sessions;
create policy interview_sessions_all on public.interview_sessions for all using (
  exists (
    select 1 from public.applications a
    join public.jobs j on j.id = a.job_id
    where a.id = application_id and j.employer_id = public.current_employer_id()
  )
) with check (
  exists (
    select 1 from public.applications a
    join public.jobs j on j.id = a.job_id
    where a.id = application_id and j.employer_id = public.current_employer_id()
  )
);

-- Transcripts (via session -> employer)
drop policy if exists interview_transcripts_all on public.interview_transcripts;
create policy interview_transcripts_all on public.interview_transcripts for all using (
  exists (
    select 1 from public.interview_sessions s
    join public.applications a on a.id = s.application_id
    join public.jobs j on j.id = a.job_id
    where s.id = session_id and j.employer_id = public.current_employer_id()
  )
) with check (
  exists (
    select 1 from public.interview_sessions s
    join public.applications a on a.id = s.application_id
    join public.jobs j on j.id = a.job_id
    where s.id = session_id and j.employer_id = public.current_employer_id()
  )
);

-- Scores
drop policy if exists interview_scores_all on public.interview_scores;
create policy interview_scores_all on public.interview_scores for all using (
  exists (
    select 1 from public.interview_sessions s
    join public.applications a on a.id = s.application_id
    join public.jobs j on j.id = a.job_id
    where s.id = session_id and j.employer_id = public.current_employer_id()
  )
) with check (
  exists (
    select 1 from public.interview_sessions s
    join public.applications a on a.id = s.application_id
    join public.jobs j on j.id = a.job_id
    where s.id = session_id and j.employer_id = public.current_employer_id()
  )
);

-- Rankings
drop policy if exists job_candidate_rankings_all on public.job_candidate_rankings;
create policy job_candidate_rankings_all on public.job_candidate_rankings for all using (
  exists (select 1 from public.jobs j where j.id = job_id and j.employer_id = public.current_employer_id())
) with check (
  exists (select 1 from public.jobs j where j.id = job_id and j.employer_id = public.current_employer_id())
);

-- Subscriptions
drop policy if exists employer_subscriptions_all on public.employer_subscriptions;
create policy employer_subscriptions_all on public.employer_subscriptions for all using (employer_id = public.current_employer_id())
  with check (employer_id = public.current_employer_id());

-- Usage
drop policy if exists employer_usage_all on public.employer_usage;
create policy employer_usage_all on public.employer_usage for all using (employer_id = public.current_employer_id())
  with check (employer_id = public.current_employer_id());

-- Storage buckets (run separately in Supabase dashboard if needed):
-- insert into storage.buckets (id, name, public) values ('interview-videos', 'interview-videos', false);
