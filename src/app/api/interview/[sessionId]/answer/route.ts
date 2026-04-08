import { NextResponse } from "next/server";
import { processAnswerAndNextQuestion } from "@/lib/services/interview-api";
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
  const contentType = request.headers.get("content-type") ?? "";

  const limited = rateLimitOrNull(
    request,
    { scope: "interview_answer", sessionId },
    { max: 30, windowMs: 60_000 },
  );
  if (limited) return limited;

  const token = getInterviewTokenFromRequest(request);
  const auth = await assertValidInterviewToken(sessionId, token);
  if (!auth.ok) return unauthorizedJson();

  try {
    if (contentType.includes("application/json")) {
      let body: { sequence?: unknown; answerText?: unknown };
      try {
        body = (await request.json()) as { sequence?: unknown; answerText?: unknown };
      } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
      }
      const sequence = Number(body.sequence);
      if (!Number.isFinite(sequence)) {
        return NextResponse.json({ error: "bad_sequence" }, { status: 400 });
      }
      const answerText =
        typeof body.answerText === "string" ? body.answerText : null;
      const result = await processAnswerAndNextQuestion(sessionId, sequence, {
        answerText,
        audioBuffer: null,
        audioMime: null,
      });
      if ("error" in result) {
        const status =
          result.error === "not_in_progress"
            ? 409
            : result.error === "answer_required"
              ? 400
              : 400;
        if (result.error === "interview_plan_invalid") {
          return NextResponse.json(
            {
              error: result.error,
              message:
                "This role does not have a valid 10-question interview plan. The employer must open the job and regenerate interview questions.",
            },
            { status: 400 },
          );
        }
        return NextResponse.json({ error: result.error }, { status });
      }
      if (result.done) {
        return NextResponse.json({ done: true });
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
    }

    const form = await request.formData();
    const sequenceRaw = form.get("sequence");
    const answerTextRaw = form.get("answer_text");
    const file = form.get("audio");

    if (typeof sequenceRaw !== "string") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    const sequence = Number(sequenceRaw);
    if (!Number.isFinite(sequence)) {
      return NextResponse.json({ error: "bad_sequence" }, { status: 400 });
    }

    const answerText =
      typeof answerTextRaw === "string" && answerTextRaw.trim().length > 0
        ? answerTextRaw
        : null;

    let audioBuffer: Buffer | null = null;
    let audioMime = "audio/webm";
    if (file instanceof Blob && file.size > 0) {
      audioBuffer = Buffer.from(await file.arrayBuffer());
      audioMime = file.type || "audio/webm";
    }

    const result = await processAnswerAndNextQuestion(sessionId, sequence, {
      answerText,
      audioBuffer,
      audioMime,
    });

    if ("error" in result) {
      const status = result.error === "not_in_progress" ? 409 : 400;
      if (result.error === "interview_plan_invalid") {
        return NextResponse.json(
          {
            error: result.error,
            message:
              "This role does not have a valid 10-question interview plan. The employer must open the job and regenerate interview questions.",
          },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: result.error }, { status });
    }
    if (result.done) {
      return NextResponse.json({ done: true });
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
    const message = e instanceof Error ? e.message : "answer_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
