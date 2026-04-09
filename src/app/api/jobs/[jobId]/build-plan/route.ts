import { NextResponse, after } from "next/server";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureEmployer } from "@/lib/services/employer";
import { generateInterviewQuestionsForRole } from "@/lib/ai/generate-interview-questions";
import { ensureJobInterviewTts } from "@/lib/jobs/job-question-tts";
import { parseInterviewQuestions } from "@/lib/jobs/interview-questions";
import { isAudioReadyForQuestions } from "@/lib/jobs/interview-audio";

export const maxDuration = 120;

async function runBackgroundTts(jobId: string) {
  const admin = createAdminClient();
  try {
    const { data: row, error } = await admin
      .from("jobs")
      .select("interview_questions")
      .eq("id", jobId)
      .maybeSingle();
    if (error || !row) return;
    const parsed = parseInterviewQuestions(row.interview_questions);
    if (isAudioReadyForQuestions(parsed)) return;
    const withTts = await ensureJobInterviewTts(jobId, parsed);
    await admin.from("jobs").update({ interview_questions: withTts }).eq("id", jobId);
  } catch (e) {
    console.error("[build-plan] background TTS failed", jobId, e);
  }
}

export async function POST(
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
    .select(
      "id, employer_id, title, description, seniority, required_skills, hiring_priorities, interview_questions, ai_interview_plan_applied",
    )
    .eq("id", jobId)
    .maybeSingle();

  if (error || !job || job.employer_id !== employer.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const parsed = parseInterviewQuestions(job.interview_questions);
  if (isAudioReadyForQuestions(parsed)) {
    return NextResponse.json({ ok: true, already: true });
  }

  const needsAiPlan = job.ai_interview_plan_applied === false;

  if (needsAiPlan) {
    const admin = createAdminClient();
    const skills = Array.isArray(job.required_skills) ? job.required_skills.map(String) : [];
    const texts = await generateInterviewQuestionsForRole({
      title: job.title,
      description: job.description,
      seniority: job.seniority,
      requiredSkills: skills,
      hiringPriorities: job.hiring_priorities,
    });

    const items = texts.map((text) => ({ id: randomUUID(), text }));
    const { error: upErr } = await admin
      .from("jobs")
      .update({
        interview_questions: items,
        ai_interview_plan_applied: true,
      })
      .eq("id", jobId);
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }
  }

  after(() => runBackgroundTts(jobId));

  return NextResponse.json({ ok: true, plan: needsAiPlan ? "generated" : "tts_scheduled" });
}
