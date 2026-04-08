import { NextResponse } from "next/server";
import { markSessionCompleteWithVideoPath } from "@/lib/services/interview-api";
import { runScoringForSession } from "@/lib/services/scoring-run";
import {
  assertValidInterviewToken,
  getInterviewTokenFromRequest,
  requireSessionVideoPath,
  unauthorizedJson,
} from "@/lib/interview/session-auth";
import { rateLimitOrNull } from "@/lib/interview/rate-limit";

/** Long uploads (multipart fallback when signed URL is unavailable). */
export const maxDuration = 120;

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  let path: string | undefined;
  let durationSeconds = 0;

  const limited = rateLimitOrNull(
    request,
    { scope: "interview_complete", sessionId },
    { max: 6, windowMs: 60_000 },
  );
  if (limited) return limited;

  const token = getInterviewTokenFromRequest(request);
  const auth = await assertValidInterviewToken(sessionId, token);
  if (!auth.ok) return unauthorizedJson();

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    let body: { path?: string; durationSeconds?: number };
    try {
      body = (await request.json()) as { path?: string; durationSeconds?: number };
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
    path = body.path;
    durationSeconds = Number(body.durationSeconds) || 0;
  } else {
    let form: FormData;
    try {
      form = await request.formData();
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        {
          error: "upload_body_read_failed",
          detail,
          hint:
            "Large videos may exceed server limits. Prefer direct upload (storage signed URL). If this persists, shorten the recording or try another network.",
        },
        { status: 413 },
      );
    }
    const file = form.get("video");
    if (file instanceof Blob) {
      const buf = Buffer.from(await file.arrayBuffer());
      const mime = file.type || "video/webm";
      const admin = (await import("@/lib/supabase/admin")).createAdminClient();
      const ext = mime.includes("webm") ? "webm" : "mp4";
      const storagePath = `${sessionId}/recording.${ext}`;
      const { error: upErr } = await admin.storage
        .from("interview-videos")
        .upload(storagePath, buf, {
          contentType: mime,
          upsert: true,
        });
      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 400 });
      }
      path = storagePath;
      durationSeconds = Number(form.get("durationSeconds") ?? 0) || 0;
    }
  }

  if (!path) {
    return NextResponse.json({ error: "missing_video" }, { status: 400 });
  }
  if (!requireSessionVideoPath(sessionId, path)) {
    return NextResponse.json({ error: "invalid_video_path" }, { status: 400 });
  }

  try {
    const result = await markSessionCompleteWithVideoPath(
      sessionId,
      path,
      durationSeconds,
    );
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    try {
      await runScoringForSession(sessionId);
    } catch (err) {
      console.error("Scoring failed", err);
    }

    return NextResponse.json({ ok: true, path });
  } catch (e) {
    const message = e instanceof Error ? e.message : "complete_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
