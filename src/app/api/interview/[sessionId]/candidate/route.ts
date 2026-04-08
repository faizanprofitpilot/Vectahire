import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadSessionBundle } from "@/lib/services/interview-api";
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
    { scope: "interview_candidate", sessionId },
    { max: 10, windowMs: 60_000 },
  );
  if (limited) return limited;

  const token = getInterviewTokenFromRequest(request);
  const auth = await assertValidInterviewToken(sessionId, token);
  if (!auth.ok) return unauthorizedJson();

  let body: { fullName?: unknown };
  try {
    body = (await request.json()) as { fullName?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  if (fullName.length < 2 || fullName.length > 120) {
    return NextResponse.json({ error: "full_name_required" }, { status: 400 });
  }

  const bundle = await loadSessionBundle(sessionId);
  if ("error" in bundle) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!bundle.candidate?.id) {
    return NextResponse.json({ error: "no_candidate" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("candidates")
    .update({ full_name: fullName })
    .eq("id", bundle.candidate.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

