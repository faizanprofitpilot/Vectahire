import { loadSessionBundle } from "@/lib/services/interview-api";
import {
  assertValidInterviewToken,
  getInterviewTokenFromRequest,
  unauthorizedJson,
} from "@/lib/interview/session-auth";
import { rateLimitOrNull } from "@/lib/interview/rate-limit";

export async function GET(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const limited = rateLimitOrNull(
    request,
    { scope: "interview_meta", sessionId },
    { max: 60, windowMs: 60_000 },
  );
  if (limited) return limited;

  const token = getInterviewTokenFromRequest(request);
  const auth = await assertValidInterviewToken(sessionId, token);
  if (!auth.ok) return unauthorizedJson();

  const bundle = await loadSessionBundle(sessionId);
  if ("error" in bundle) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  const { session, job, candidate } = bundle;
  const companyName = job?.employers?.company_name ?? "";
  return Response.json({
    status: session.status,
    jobTitle: job?.title ?? "",
    companyName,
    candidateName: candidate?.full_name?.trim() ?? "",
  });
}
