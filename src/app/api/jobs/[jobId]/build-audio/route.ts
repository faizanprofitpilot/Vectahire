import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureJobInterviewTts } from "@/lib/jobs/job-question-tts";
import { parseInterviewQuestions } from "@/lib/jobs/interview-questions";
import { isAudioReadyForQuestions } from "@/lib/jobs/interview-audio";
import { getQStashReceiver } from "@/lib/qstash";

export async function POST(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;

  const signature = request.headers.get("upstash-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const body = await request.text();
  try {
    const receiver = getQStashReceiver();
    const ok = await receiver.verify({
      signature,
      body,
      url: request.url,
    });
    if (!ok) {
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: job, error } = await admin
    .from("jobs")
    .select("id, interview_questions")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !job) {
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

