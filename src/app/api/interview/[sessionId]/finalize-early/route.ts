import { NextResponse } from "next/server";
import { finalizeInterviewSessionEarly } from "@/lib/services/interview-api";
import { runScoringForSession } from "@/lib/services/scoring-run";
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
    { scope: "interview_finalize_early", sessionId },
    { max: 10, windowMs: 60_000 },
  );
  if (limited) return limited;

  const token = getInterviewTokenFromRequest(request);
  const auth = await assertValidInterviewToken(sessionId, token);
  if (!auth.ok) return unauthorizedJson();

  try {
    const result = await finalizeInterviewSessionEarly(sessionId);
    if ("error" in result) {
      if (result.error === "not_in_progress") {
        return NextResponse.json({ error: result.error }, { status: 409 });
      }
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Await so sendBeacon/keepalive connections stay open until scoring finishes (tab-close path).
    try {
      await runScoringForSession(sessionId);
    } catch (err) {
      console.error("Scoring failed (early finalize)", err);
    }

    return NextResponse.json({ ok: true, already: result.already });
  } catch (e) {
    const message = e instanceof Error ? e.message : "finalize_early_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
