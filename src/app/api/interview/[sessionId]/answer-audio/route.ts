import { NextResponse } from "next/server";
import { ingestAnswerAudioForRefinement } from "@/lib/services/interview-api";
import {
  assertValidInterviewToken,
  getInterviewTokenFromRequest,
  unauthorizedJson,
} from "@/lib/interview/session-auth";
import { rateLimitOrNull } from "@/lib/interview/rate-limit";

/**
 * Optional second request: upload raw answer audio for Deepgram refinement after
 * the fast JSON /answer call already advanced the turn.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const limited = rateLimitOrNull(
    request,
    { scope: "interview_answer_audio", sessionId },
    { max: 20, windowMs: 60_000 },
  );
  if (limited) return limited;

  const token = getInterviewTokenFromRequest(request);
  const auth = await assertValidInterviewToken(sessionId, token);
  if (!auth.ok) return unauthorizedJson();

  try {
    const form = await request.formData();
    const sequenceRaw = form.get("sequence");
    const file = form.get("audio");
    if (typeof sequenceRaw !== "string" || !file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    const sequence = Number(sequenceRaw);
    if (!Number.isFinite(sequence)) {
      return NextResponse.json({ error: "bad_sequence" }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const mime = file.type || "audio/webm";
    const result = await ingestAnswerAudioForRefinement(sessionId, sequence, buf, mime);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "answer_audio_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
