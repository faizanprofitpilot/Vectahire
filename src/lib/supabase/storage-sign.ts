import { createAdminClient } from "@/lib/supabase/admin";

export async function signInterviewVideoUrl(
  path: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("interview-videos")
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
