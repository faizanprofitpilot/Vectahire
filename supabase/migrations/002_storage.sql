-- Create bucket in Dashboard: Storage → New bucket → interview-videos (private)
-- Or: insert into storage.buckets (id, name, public) values ('interview-videos', 'interview-videos', false);

-- Employers can read objects under paths for sessions they own (path prefix = session id)
create policy "Employers read own interview videos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'interview-videos'
  and exists (
    select 1
    from public.interview_sessions s
    join public.applications a on a.id = s.application_id
    join public.jobs j on j.id = a.job_id
    where j.employer_id = public.current_employer_id()
      and (storage.foldername(name))[1] = s.id::text
  )
);

-- Service role uploads bypass RLS; optional policy for authenticated upload is not used (candidate uses anon + API with service role)
