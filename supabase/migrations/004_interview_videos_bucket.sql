-- Required for POST .../video-upload-url (createSignedUploadUrl).
-- Without this bucket, that endpoint returns 400 and clients fall back to multipart complete (size-limited).
insert into storage.buckets (id, name, public)
values ('interview-videos', 'interview-videos', false)
on conflict (id) do nothing;
