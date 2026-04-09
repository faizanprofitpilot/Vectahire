import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureJobInterviewTts } from "@/lib/jobs/job-question-tts";
import { parseInterviewQuestions } from "@/lib/jobs/interview-questions";
import { isAudioReadyForQuestions } from "@/lib/jobs/interview-audio";
import { createClient } from "@/lib/supabase/server";
import { ensureEmployer } from "@/lib/services/employer";

export const maxDuration = 120;

export async function POST(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const employer = await ensureEmployer(user);

  const admin = createAdminClient();
  const { data: job, error } = await supabase
    .from("jobs")
    .select("id, employer_id, interview_questions")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !job || job.employer_id !== employer.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const questions = parseInterviewQuestions(job.interview_questions);
  if (isAudioReadyForQuestions(questions)) {
    return NextResponse.json({ ok: true, already: true });
  }

  const withTts = await ensureJobInterviewTts(jobId, questions);
  await admin
    .from("jobs")
    .update({ interview_questions: withTts })
    .eq("id", jobId);

  return NextResponse.json({ ok: true });
}

