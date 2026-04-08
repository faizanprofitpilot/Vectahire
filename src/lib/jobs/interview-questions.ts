import { randomUUID } from "crypto";
import { z } from "zod";

export const interviewQuestionItemSchema = z.object({
  id: z.string().min(1).max(80),
  text: z.string().min(1).max(2000),
  /** Supabase Storage path under `interview-videos` (pre-generated MP3). */
  tts_path: z.string().min(1).max(500).optional(),
});

export type InterviewQuestionItem = z.infer<typeof interviewQuestionItemSchema>;

const listSchema = z.array(interviewQuestionItemSchema).length(10);

/** Parse DB json into stable `{ id, text }[]` (migrates plain strings). */
export function parseInterviewQuestions(raw: unknown): InterviewQuestionItem[] {
  if (!raw) return [];
  if (!Array.isArray(raw)) return [];
  const out: InterviewQuestionItem[] = [];
  for (const row of raw) {
    if (typeof row === "string") {
      const t = row.trim();
      if (t) out.push({ id: randomUUID(), text: t });
      continue;
    }
    if (row && typeof row === "object" && "text" in row) {
      const t = String((row as { text: unknown }).text).trim();
      if (!t) continue;
      const rawId = (row as { id: unknown }).id;
      const id =
        typeof rawId === "string" && rawId.trim().length > 0 ? rawId.trim() : randomUUID();
      const tp = (row as { tts_path?: unknown }).tts_path;
      const tts_path =
        typeof tp === "string" && tp.trim().length > 0 ? tp.trim() : undefined;
      out.push({ id, text: t, ...(tts_path ? { tts_path } : {}) });
    }
  }
  return out;
}

export function validateInterviewQuestionsList(
  raw: unknown,
): { ok: true; value: InterviewQuestionItem[] } | { ok: false; error: string } {
  const parsed = listSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid questions" };
  }
  return { ok: true, value: parsed.data };
}

/** Ensure ids and trim; drop empties. */
export function normalizeInterviewQuestionsInput(
  items: { id: string; text: string; tts_path?: string | null }[],
): InterviewQuestionItem[] {
  return items
    .map((q) => ({
      id: q.id?.trim() || randomUUID(),
      text: q.text.trim(),
      ...(q.tts_path?.trim() ? { tts_path: q.tts_path.trim() } : {}),
    }))
    .filter((q) => q.text.length > 0);
}
