/** Recruiter-facing copy, avoid raw session/application enum strings in UI. */

export const VERDICT_LABEL: Record<string, string> = {
  strong_hire: "Strong hire",
  hire: "Hire",
  maybe: "Maybe",
  no_hire: "No hire",
};

export function verdictLabel(verdict: string | null | undefined): string {
  if (!verdict) return "-";
  return VERDICT_LABEL[verdict] ?? verdict.replace(/_/g, " ");
}

export type SessionShape = {
  status: string;
  scoring_status?: string;
  ended_at?: string | null;
  updated_at?: string | null;
  interview_scores?: unknown;
  interview_transcripts?: unknown;
  video_storage_path?: string | null;
};

export function pickSession(
  raw: SessionShape | SessionShape[] | null | undefined | unknown,
): SessionShape | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return (raw[0] as SessionShape | undefined) ?? null;
  return raw as SessionShape;
}

type ScoreShape = { overall_score?: number; final_verdict?: string };

export function pickScore(raw: unknown): ScoreShape | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return (raw[0] as ScoreShape | undefined) ?? null;
  return raw as ScoreShape;
}

export type PipelineBucket =
  | "all"
  | "not_started"
  | "live"
  | "ready"
  | "scoring";

export function pipelineBucketFromRow(row: { interview_sessions: unknown }): PipelineBucket {
  const sess = pickSession(row.interview_sessions);
  if (!sess || sess.status === "pending") return "not_started";
  if (sess.status === "in_progress") return "live";
  if (sess.status === "completed") {
    const sc = pickScore(sess.interview_scores);
    if (sc?.overall_score != null) return "ready";
    return "scoring";
  }
  if (sess.status === "abandoned") return "not_started";
  return "not_started";
}

/** Single-line status for tables and headers. */
export function pipelineHeadline(row: { interview_sessions: unknown }): string {
  const sess = pickSession(row.interview_sessions);
  if (!sess || sess.status === "pending") return "Not started";
  if (sess.status === "in_progress") return "Interview live";
  if (sess.status === "abandoned") return "Incomplete";
  if (sess.status === "completed") {
    const sc = pickScore(sess.interview_scores);
    if (sc?.final_verdict) return verdictLabel(sc.final_verdict);
    if (sess.scoring_status === "failed") return "Scoring issue";
    if (sess.scoring_status === "processing" || sess.scoring_status === "pending") {
      return "Scoring…";
    }
    return "Completed";
  }
  return "-";
}

export function isStrongVerdict(verdict: string | null | undefined): boolean {
  return verdict === "strong_hire" || verdict === "hire";
}
