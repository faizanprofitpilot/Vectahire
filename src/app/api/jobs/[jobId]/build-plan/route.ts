import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureEmployer } from "@/lib/services/employer";
import { generateInterviewQuestionsForRole } from "@/lib/ai/generate-interview-questions";
import { ensureJobInterviewTts } from "@/lib/jobs/job-question-tts";
import { randomUUID } from "crypto";

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

  const { data: job, error } = await supabase
    .from("jobs")
    .select("id, employer_id, title, description, seniority, required_skills, hiring_priorities")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !job || job.employer_id !== employer.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

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
  const withTts = await ensureJobInterviewTts(jobId, items);

  await admin.from("jobs").update({ interview_questions: withTts }).eq("id", jobId);
  return NextResponse.json({ ok: true });
}

