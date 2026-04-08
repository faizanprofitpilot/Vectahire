-- Public interview hardening: per-session access token
alter table if exists public.interview_sessions
  add column if not exists access_token text not null
  default encode(gen_random_bytes(32), 'hex');

create index if not exists interview_sessions_access_token_idx
  on public.interview_sessions (access_token);

