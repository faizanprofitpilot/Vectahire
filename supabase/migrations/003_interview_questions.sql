-- Planned interview questions per job (employer-editable; guides live AI interview)
alter table public.jobs
  add column if not exists interview_questions jsonb not null default '[]'::jsonb;

comment on column public.jobs.interview_questions is
  'JSON array of { id: uuid, text: string } — order is display and preferred interview order.';
