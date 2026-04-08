import { createAdminClient } from "@/lib/supabase/admin";

type SessionEmbed = {
  id: string;
  status: string;
  interview_scores:
    | { overall_score: number }
    | { overall_score: number }[]
    | null;
};

type AppRow = {
  id: string;
  interview_sessions: SessionEmbed | SessionEmbed[] | null;
};

function normalizeSessions(raw: AppRow["interview_sessions"]): SessionEmbed[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function readOverall(sess: SessionEmbed): number | null {
  const sc = sess.interview_scores;
  if (!sc) return null;
  const row = Array.isArray(sc) ? sc[0] : sc;
  if (row && typeof row.overall_score === "number") return row.overall_score;
  return null;
}

export async function recomputeRankingsForJob(jobId: string) {
  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from("applications")
    .select(
      `
      id,
      interview_sessions (
        id,
        status,
        interview_scores ( overall_score )
      )
    `,
    )
    .eq("job_id", jobId);

  if (error) throw error;

  const scored: { applicationId: string; score: number }[] = [];
  for (const r of (rows ?? []) as AppRow[]) {
    const sessions = normalizeSessions(r.interview_sessions);
    for (const sess of sessions) {
      if (sess.status !== "completed") continue;
      const s = readOverall(sess);
      if (typeof s === "number") {
        scored.push({ applicationId: r.id, score: s });
        break;
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);

  await admin.from("job_candidate_rankings").delete().eq("job_id", jobId);

  let rank = 1;
  for (const row of scored) {
    await admin.from("job_candidate_rankings").insert({
      job_id: jobId,
      application_id: row.applicationId,
      rank,
      overall_score: row.score,
    });
    rank += 1;
  }
}
