import { createAdminClient } from "@/lib/supabase/admin";

export const INTERVIEW_TOKEN_QUERY_PARAM = "t";
export const INTERVIEW_TOKEN_HEADER = "x-interview-token";

function safeEqual(a: string, b: string): boolean {
  // constant-time-ish compare (length check + charCode loop)
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export function getInterviewTokenFromRequest(request: Request): string | null {
  const h = request.headers.get(INTERVIEW_TOKEN_HEADER);
  if (h && h.trim()) return h.trim();

  const url = new URL(request.url);
  const q = url.searchParams.get(INTERVIEW_TOKEN_QUERY_PARAM);
  if (q && q.trim()) return q.trim();

  return null;
}

export async function assertValidInterviewToken(
  sessionId: string,
  token: string | null,
): Promise<{ ok: true } | { ok: false }> {
  if (!token) return { ok: false };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("interview_sessions")
    .select("access_token")
    .eq("id", sessionId)
    .maybeSingle();

  const actual = data?.access_token ?? "";
  if (error || !actual) return { ok: false };
  if (!safeEqual(actual, token)) return { ok: false };

  return { ok: true };
}

export function unauthorizedJson() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

export function requireSessionVideoPath(sessionId: string, path: string): boolean {
  // Only accept a very small set of allowed paths.
  // Keep strict: prevents cross-session path injection.
  if (!path || typeof path !== "string") return false;
  if (!path.startsWith(`${sessionId}/`)) return false;
  if (path !== `${sessionId}/recording.webm` && path !== `${sessionId}/recording.mp4`) {
    return false;
  }
  return true;
}

