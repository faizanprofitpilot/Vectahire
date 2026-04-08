import { NextResponse } from "next/server";
import { ensureFirstQuestionOrResume } from "@/lib/services/interview-api";
import {
  assertValidInterviewToken,
  getInterviewTokenFromRequest,
  unauthorizedJson,
} from "@/lib/interview/session-auth";
import { rateLimitOrNull } from "@/lib/interview/rate-limit";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const limited = rateLimitOrNull(
    request,
    { scope: "interview_start", sessionId },
    { max: 20, windowMs: 60_000 },
  );
  if (limited) return limited;

  const token = getInterviewTokenFromRequest(request);
  const auth = await assertValidInterviewToken(sessionId, token);
  if (!auth.ok) return unauthorizedJson();

  try {
    const result = await ensureFirstQuestionOrResume(sessionId);
    if ("error" in result) {
      if (result.error === "not_found")
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      if (result.error === "closed")
        return NextResponse.json(
          { error: "closed", status: result.status },
          { status: 409 },
        );
      if (result.error === "interview_plan_invalid")
        return NextResponse.json(
          {
            error: result.error,
            message:
              "This role does not have a valid 10-question interview plan. The employer must open the job and regenerate interview questions.",
          },
          { status: 400 },
        );
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    if (result.done) {
      return NextResponse.json({ done: true, message: result.message ?? "" });
    }
    return NextResponse.json({
      done: false,
      sequence: result.sequence,
      questionText: result.questionText,
      audioUrl: result.audioUrl,
      audioBase64: result.audioBase64,
      mime: result.mime,
      prefetchAudioUrl: result.prefetchAudioUrl,
      progress: result.progress,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "start_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
