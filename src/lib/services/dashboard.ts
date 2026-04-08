import { createClient } from "@/lib/supabase/server";

export async function getDashboardSnapshot(employerId: string) {
  const supabase = await createClient();

  const { count: activeJobs } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("employer_id", employerId);

  const { data: jobRows } = await supabase
    .from("jobs")
    .select("id")
    .eq("employer_id", employerId);

  const jobIds = (jobRows ?? []).map((j) => j.id);

  let inProgress = 0;
  let completed = 0;
  let pendingInvites = 0;
  let totalApplications = 0;
  let applicationIds: string[] = [];

  if (jobIds.length > 0) {
    const { data: applications } = await supabase
      .from("applications")
      .select("id, status")
      .in("job_id", jobIds);

    const appList = applications ?? [];
    totalApplications = appList.length;
    pendingInvites = appList.filter((a) => a.status === "invited").length;
    applicationIds = appList.map((a) => a.id);

    if (applicationIds.length > 0) {
      const { data: sessions } = await supabase
        .from("interview_sessions")
        .select("status")
        .in("application_id", applicationIds);

      for (const s of sessions ?? []) {
        if (s.status === "in_progress") inProgress += 1;
        if (s.status === "completed") completed += 1;
      }
    }
  }

  const { data: recentJobs } = await supabase
    .from("jobs")
    .select("id, title, created_at")
    .eq("employer_id", employerId)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: recentCandidates } = await supabase
    .from("candidates")
    .select("id, full_name, email, created_at")
    .eq("employer_id", employerId)
    .order("created_at", { ascending: false })
    .limit(6);

  let completedSessions: {
    id: string;
    application_id: string;
    ended_at: string | null;
    applications: {
      jobs: { title: string } | null;
      candidates: { full_name: string | null; email: string } | null;
    } | null;
  }[] = [];

  if (applicationIds.length > 0) {
    const { data: sess } = await supabase
      .from("interview_sessions")
      .select(
        `
        id,
        application_id,
        ended_at,
        applications (
          jobs (title),
          candidates (full_name, email)
        )
      `,
      )
      .in("application_id", applicationIds)
      .eq("status", "completed")
      .order("ended_at", { ascending: false })
      .limit(6);
    completedSessions = (sess ?? []) as unknown as typeof completedSessions;
  }

  let topRanked: {
    id: string;
    application_id: string;
    rank: number;
    overall_score: number;
    applications: {
      candidates: { full_name: string | null; email: string } | null;
    } | null;
    jobs: { title: string } | null;
  }[] = [];

  if (jobIds.length > 0) {
    const { data: ranks } = await supabase
      .from("job_candidate_rankings")
      .select(
        `
        id,
        rank,
        overall_score,
        application_id,
        applications (
          candidates (full_name, email)
        ),
        jobs (title)
      `,
      )
      .in("job_id", jobIds)
      .order("overall_score", { ascending: false })
      .limit(5);
    topRanked = (ranks ?? []) as unknown as typeof topRanked;
  }

  return {
    activeJobs: activeJobs ?? 0,
    inProgress,
    completed,
    pendingInvites,
    totalApplications,
    recentJobs: recentJobs ?? [],
    recentCandidates: recentCandidates ?? [],
    completedSessions,
    topRanked,
  };
}
