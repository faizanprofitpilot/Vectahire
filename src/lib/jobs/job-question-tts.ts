import { createAdminClient } from "@/lib/supabase/admin";
import { textToSpeechMp3 } from "@/lib/deepgram";
import type { InterviewQuestionItem } from "@/lib/jobs/interview-questions";

const BUCKET = "interview-videos";

function ttsConcurrency(): number {
  const raw = process.env.JOB_TTS_CONCURRENCY;
  const n = raw ? Number.parseInt(raw, 10) : 4;
  if (!Number.isFinite(n) || n < 1) return 4;
  return Math.min(10, n);
}

/** Storage path for cached TTS MP3: `tts/{jobId}/{index}.mp3` */
export function jobQuestionTtsPath(jobId: string, index: number): string {
  return `tts/${jobId}/${index}.mp3`;
}

/**
 * Generate and upload Deepgram TTS for each question missing `tts_path`.
 * Idempotent: skips items that already have `tts_path`.
 * Missing clips are processed concurrently (JOB_TTS_CONCURRENCY, default 4).
 */
export async function ensureJobInterviewTts(
  jobId: string,
  questions: InterviewQuestionItem[],
): Promise<InterviewQuestionItem[]> {
  const admin = createAdminClient();
  const out: InterviewQuestionItem[] = questions.map((q) => ({ ...q }));

  const pending: number[] = [];
  for (let i = 0; i < out.length; i++) {
    const q = out[i]!;
    if (!q.tts_path?.trim()) pending.push(i);
  }
  if (pending.length === 0) return out;

  const limit = Math.min(ttsConcurrency(), pending.length);
  const queue = [...pending];

  async function worker() {
    while (queue.length > 0) {
      const i = queue.shift();
      if (i === undefined) return;
      const q = out[i]!;
      const buf = await textToSpeechMp3(q.text);
      const path = jobQuestionTtsPath(jobId, i);
      const { error } = await admin.storage.from(BUCKET).upload(path, buf, {
        contentType: "audio/mpeg",
        upsert: true,
      });
      if (error) throw new Error(error.message);
      out[i] = { ...q, tts_path: path };
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
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
