import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getQStashReceiver } from "@/lib/qstash";
import { generateInterviewQuestionsForRole } from "@/lib/ai/generate-interview-questions";
import { ensureJobInterviewTts } from "@/lib/jobs/job-question-tts";
import { randomUUID } from "crypto";

export const maxDuration = 120;

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
    const ok = await receiver.verify({ signature, body, url: request.url });
    if (!ok) return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: job, error } = await admin
    .from("jobs")
    .select("id, title, description, seniority, required_skills, hiring_priorities")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !job) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

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

