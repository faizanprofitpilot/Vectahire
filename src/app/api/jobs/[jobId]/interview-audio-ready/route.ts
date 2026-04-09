import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureEmployer } from "@/lib/services/employer";
import { parseInterviewQuestions } from "@/lib/jobs/interview-questions";
import { isAudioReadyForQuestions } from "@/lib/jobs/interview-audio";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const employer = await ensureEmployer(user);

  const { data: job, error } = await supabase
    .from("jobs")
    .select("employer_id, interview_questions")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !job || job.employer_id !== employer.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const ready = isAudioReadyForQuestions(parseInterviewQuestions(job.interview_questions));
  return NextResponse.json({ ready });
}
