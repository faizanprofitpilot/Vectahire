-- Tracks whether the job's interview_questions text was produced by the AI plan builder.
-- null = legacy row (never auto-regenerate question text in build-plan)
-- false = new job / reset role context; build-plan may run OpenAI once
-- true = AI plan text is in place; build-plan only fills missing TTS
alter table public.jobs
  add column if not exists ai_interview_plan_applied boolean;

comment on column public.jobs.ai_interview_plan_applied is
  'null legacy, false needs AI plan text, true plan text set (TTS may still be pending)';
