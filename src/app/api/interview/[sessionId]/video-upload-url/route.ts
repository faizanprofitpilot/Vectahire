import { NextResponse } from "next/server";
import { createInterviewVideoUploadUrl } from "@/lib/services/interview-api";
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
    { scope: "interview_video_upload_url", sessionId },
    { max: 10, windowMs: 60_000 },
  );
  if (limited) return limited;

  const token = getInterviewTokenFromRequest(request);
  const auth = await assertValidInterviewToken(sessionId, token);
  if (!auth.ok) return unauthorizedJson();

  try {
    const result = await createInterviewVideoUploadUrl(sessionId);
    if ("error" in result) {
      if (result.error === "not_found")
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      // Storage misconfiguration (e.g. missing bucket) — distinct from bad client input.
      const isStorage = /bucket|storage|upload/i.test(result.error);
      return NextResponse.json(
        { error: result.error, code: isStorage ? "storage" : "bad_request" },
        { status: isStorage ? 503 : 400 },
      );
    }
    return NextResponse.json({
      path: result.path,
      signedUrl: result.signedUrl,
      token: result.token,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "upload_url_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
