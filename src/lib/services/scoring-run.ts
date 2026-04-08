import { createAdminClient } from "@/lib/supabase/admin";
import { scoreInterview } from "@/lib/ai/scoring-agent";
import { recomputeRankingsForJob } from "@/lib/services/ranking";
import { incrementInterviewsCompletedAdmin } from "@/lib/services/usage-admin";

export async function runScoringForSession(sessionId: string) {
  const admin = createAdminClient();

  const { data: session, error: sErr } = await admin
    .from("interview_sessions")
    .select(
      `
      id,
      application_id,
      scoring_status,
      applications (
        job_id,
        candidates ( full_name, email ),
        jobs (
          title,
          description,
          seniority,
          required_skills,
          hiring_priorities,
          employer_id
        )
      )
    `,
    )
    .eq("id", sessionId)
    .single();

  if (sErr || !session) throw sErr ?? new Error("Session not found");

  if (session.scoring_status === "completed") {
    return;
  }

  const rawApp = session.applications as unknown;
  const appRow = Array.isArray(rawApp) ? rawApp[0] : rawApp;
  const app = appRow as {
    job_id: string;
    candidates: { full_name: string | null; email: string } | null;
    jobs: {
      title: string;
      description: string;
      seniority: string;
      required_skills: unknown;
      hiring_priorities: string | null;
      employer_id: string;
    } | null;
  } | null;

  if (!app?.jobs) throw new Error("Missing job context");

  await admin
    .from("interview_sessions")
    .update({ scoring_status: "processing" })
    .eq("id", sessionId);

  const { data: lines, error: tErr } = await admin
    .from("interview_transcripts")
    .select("question_text, answer_text, is_follow_up, sequence")
    .eq("session_id", sessionId)
    .order("sequence", { ascending: true });

  if (tErr) throw tErr;

  const transcript = (lines ?? []).map((l) => ({
    question: l.question_text,
    answer: l.answer_text,
    is_follow_up: l.is_follow_up,
  }));

  const skills = Array.isArray(app.jobs.required_skills)
    ? (app.jobs.required_skills as string[])
    : [];

  try {
    const result = await scoreInterview({
      jobTitle: app.jobs.title,
      jobDescription: app.jobs.description,
      seniority: app.jobs.seniority,
      requiredSkills: skills,
      hiringPriorities: app.jobs.hiring_priorities,
      candidateName: app.candidates?.full_name?.trim() || "Candidate",
      transcript,
    });

    await admin.from("interview_scores").upsert(
      {
        session_id: sessionId,
        overall_score: Math.round(result.overall_score),
        communication_score: Math.round(result.communication_score),
        role_fit_score: Math.round(result.role_fit_score),
        problem_solving_score: Math.round(result.problem_solving_score),
        experience_score: Math.round(result.experience_score),
        confidence_score: Math.round(result.confidence_score),
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        risks: result.risks,
        summary: result.summary,
        final_verdict: result.final_verdict,
      },
      { onConflict: "session_id" },
    );

    await admin
      .from("interview_sessions")
      .update({ scoring_status: "completed" })
      .eq("id", sessionId);

    await recomputeRankingsForJob(app.job_id);
    await incrementInterviewsCompletedAdmin(app.jobs.employer_id);
  } catch (e) {
    await admin
      .from("interview_sessions")
      .update({ scoring_status: "failed" })
      .eq("id", sessionId);
    throw e;
  }
}
