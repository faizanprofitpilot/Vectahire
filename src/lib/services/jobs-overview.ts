import { createClient } from "@/lib/supabase/server";
import { pickScore, pickSession } from "@/lib/employer/pipeline-status";

export type JobWithHiringStats = {
  id: string;
  title: string;
  seniority: string;
  location: string | null;
  created_at: string;
  candidateCount: number;
  completedInterviewCount: number;
  scoredCount: number;
  topScore: number | null;
  avgScore: number | null;
  leadingCandidate: string | null;
};

export async function getEmployerJobsWithStats(
  employerId: string,
): Promise<JobWithHiringStats[]> {
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, seniority, location, created_at")
    .eq("employer_id", employerId)
    .order("created_at", { ascending: false });

  if (!jobs?.length) return [];

  const jobIds = jobs.map((j) => j.id);

  const { data: applications } = await supabase
    .from("applications")
    .select(
      `
      id,
      job_id,
      candidates ( full_name, email ),
      interview_sessions (
        status,
        interview_scores ( overall_score )
      )
    `,
    )
    .in("job_id", jobIds);

  type AppRow = {
    id: string;
    job_id: string;
    candidates: { full_name: string | null; email: string } | null;
    interview_sessions: unknown;
  };

  const apps = (applications ?? []) as unknown as AppRow[];

  const byJob = new Map<string, AppRow[]>();
  for (const a of apps) {
    const list = byJob.get(a.job_id) ?? [];
    list.push(a);
    byJob.set(a.job_id, list);
  }

  return jobs.map((j) => {
    const list = byJob.get(j.id) ?? [];
    let completedInterviewCount = 0;
    const scores: number[] = [];
    let best: { score: number; name: string } | null = null;

    for (const a of list) {
      const sess = pickSession(
        a.interview_sessions as Parameters<typeof pickSession>[0],
      );
      if (sess?.status === "completed") completedInterviewCount += 1;
      const sc = pickScore(sess?.interview_scores);
      if (typeof sc?.overall_score === "number") {
        scores.push(sc.overall_score);
        const name = a.candidates?.full_name?.trim() || "Candidate";
        if (!best || sc.overall_score > best.score) {
          best = { score: sc.overall_score, name };
        }
      }
    }

    const scoredCount = scores.length;
    const topScore = best?.score ?? null;
    const avgScore =
      scores.length > 0
        ? Math.round(scores.reduce((s, x) => s + x, 0) / scores.length)
        : null;

    return {
      id: j.id,
      title: j.title,
      seniority: j.seniority,
      location: j.location,
      created_at: j.created_at,
      candidateCount: list.length,
      completedInterviewCount,
      scoredCount,
      topScore,
      avgScore,
      leadingCandidate: best?.name ?? null,
    };
  });
}
