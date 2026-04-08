import { createAdminClient } from "@/lib/supabase/admin";
import { textToSpeechMp3 } from "@/lib/deepgram";
import type { InterviewQuestionItem } from "@/lib/jobs/interview-questions";

const BUCKET = "interview-videos";

/** Storage path for cached TTS MP3: `tts/{jobId}/{index}.mp3` */
export function jobQuestionTtsPath(jobId: string, index: number): string {
  return `tts/${jobId}/${index}.mp3`;
}

/**
 * Generate and upload Deepgram TTS for each question missing `tts_path`.
 * Idempotent: skips items that already have `tts_path`.
 */
export async function ensureJobInterviewTts(
  jobId: string,
  questions: InterviewQuestionItem[],
): Promise<InterviewQuestionItem[]> {
  const admin = createAdminClient();
  const out: InterviewQuestionItem[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]!;
    if (q.tts_path && q.tts_path.trim().length > 0) {
      out.push(q);
      continue;
    }
    const buf = await textToSpeechMp3(q.text);
    const path = jobQuestionTtsPath(jobId, i);
    const { error } = await admin.storage.from(BUCKET).upload(path, buf, {
      contentType: "audio/mpeg",
      upsert: true,
    });
    if (error) throw new Error(error.message);
    out.push({ ...q, tts_path: path });
  }

  return out;
}

/** Signed GET URL for candidate playback (short-lived). */
export async function signedUrlForJobQuestionAudio(ttsPath: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(ttsPath, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
