"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { ensureEmployer } from "@/lib/services/employer";
import {
  normalizeInterviewQuestionsInput,
  parseInterviewQuestions,
  validateInterviewQuestionsList,
  type InterviewQuestionItem,
} from "@/lib/jobs/interview-questions";
import { generateInterviewQuestionsForRole } from "@/lib/ai/generate-interview-questions";

export async function saveInterviewQuestionsAction(
  jobId: string,
  questions: { id: string; text: string }[],
): Promise<{ error?: string; success?: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const employer = await ensureEmployer(user);

  const normalized = normalizeInterviewQuestionsInput(questions);
  const check = validateInterviewQuestionsList(normalized);
  if (!check.ok) return { error: check.error };

  const { data: job } = await supabase
    .from("jobs")
    .select("interview_questions")
    .eq("id", jobId)
    .eq("employer_id", employer.id)
    .maybeSingle();

  if (!job) return { error: "Role not found" };

  const prevList = parseInterviewQuestions(job.interview_questions);
  const merged: InterviewQuestionItem[] = normalized.map((q, i) => {
    const prev = prevList[i];
    if (prev && prev.text === q.text && prev.tts_path?.trim()) {
      return { id: q.id, text: q.text, tts_path: prev.tts_path };
    }
    return { id: q.id, text: q.text };
  });

  try {
    const { error } = await supabase
      .from("jobs")
      .update({ interview_questions: merged })
      .eq("id", jobId);

    if (error) return { error: error.message };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not update interview questions";
    return { error: message };
  }

  revalidatePath(`/dashboard/jobs/${jobId}`);
  revalidatePath("/dashboard/jobs");
  return { success: true };
}

export async function generateInterviewQuestionsAction(
  jobId: string,
): Promise<{ error?: string; questions?: InterviewQuestionItem[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const employer = await ensureEmployer(user);

  const { data: job, error: fetchErr } = await supabase
    .from("jobs")
    .select(
      "id, title, description, seniority, required_skills, hiring_priorities",
    )
    .eq("id", jobId)
    .eq("employer_id", employer.id)
    .maybeSingle();

  if (fetchErr || !job) return { error: "Role not found" };

  const skills = Array.isArray(job.required_skills)
    ? job.required_skills.map(String)
    : [];

  try {
    const texts = await generateInterviewQuestionsForRole({
      title: job.title,
      description: job.description,
      seniority: job.seniority,
      requiredSkills: skills,
      hiringPriorities: job.hiring_priorities,
    });

    const questions: InterviewQuestionItem[] = texts.map((text) => ({
      id: randomUUID(),
      text,
    }));

    const { error } = await supabase
      .from("jobs")
      .update({ interview_questions: questions, ai_interview_plan_applied: true })
      .eq("id", jobId);

    if (error) return { error: error.message };

    revalidatePath(`/dashboard/jobs/${jobId}`);
    revalidatePath("/dashboard/jobs");
    return { questions };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generation failed";
    return { error: message };
  }
}
