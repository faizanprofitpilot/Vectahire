"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureEmployer } from "@/lib/services/employer";
import { jobFormSchema } from "@/lib/validation/job";
import { enrichJobDescription, generateJobFieldsFromTitle } from "@/lib/ai/job-enrich";
import { defaultInterviewQuestions } from "@/lib/jobs/default-interview-questions";

export async function createJob(formData: FormData) {
  const dbg = process.env.DEBUG_JOB_CREATE_TIMING === "1";
  const mark = (label: string) => {
    if (dbg) console.time(`[createJob] ${label}`);
  };
  const end = (label: string) => {
    if (dbg) console.timeEnd(`[createJob] ${label}`);
  };

  mark("createClient");
  const supabase = await createClient();
  end("createClient");

  mark("getUser");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  end("getUser");
  if (!user) redirect("/login");

  mark("ensureEmployer");
  const employer = await ensureEmployer(user);
  end("ensureEmployer");

  const parsed = jobFormSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    required_skills: JSON.parse(String(formData.get("required_skills") || "[]")),
    seniority: formData.get("seniority"),
    location: formData.get("location"),
    salary_min: formData.get("salary_min") || null,
    salary_max: formData.get("salary_max") || null,
    salary_currency: formData.get("salary_currency") || "USD",
    hiring_priorities: formData.get("hiring_priorities") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form" };
  }

  const v = parsed.data;
  let interviewFocus: unknown = null;
  const focusRaw = formData.get("interview_focus");
  if (typeof focusRaw === "string" && focusRaw.trim()) {
    try {
      interviewFocus = JSON.parse(focusRaw);
    } catch {
      interviewFocus = null;
    }
  }

  mark("jobs.insert");
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      employer_id: employer.id,
      title: v.title,
      description: v.description,
      required_skills: v.required_skills,
      seniority: v.seniority,
      location: v.location,
      salary_min: v.salary_min ?? null,
      salary_max: v.salary_max ?? null,
      salary_currency: v.salary_currency,
      hiring_priorities: v.hiring_priorities ?? null,
      interview_focus: interviewFocus,
      // Attach a usable 10-question draft at insert-time (single DB round-trip).
      interview_questions: defaultInterviewQuestions({
        title: v.title,
        seniority: v.seniority,
        requiredSkills: v.required_skills,
      }),
      ai_interview_plan_applied: false,
    })
    .select("id")
    .single();
  end("jobs.insert");

  if (error) return { error: error.message };

  // AI + audio are generated automatically in the background (job page kickoff).

  mark("revalidatePath(dashboard)");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/jobs");
  end("revalidatePath(dashboard)");

  redirect(`/dashboard/jobs/${data.id}`);
}

export async function updateJob(jobId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await ensureEmployer(user);

  const parsed = jobFormSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    required_skills: JSON.parse(String(formData.get("required_skills") || "[]")),
    seniority: formData.get("seniority"),
    location: formData.get("location"),
    salary_min: formData.get("salary_min") || null,
    salary_max: formData.get("salary_max") || null,
    salary_currency: formData.get("salary_currency") || "USD",
    hiring_priorities: formData.get("hiring_priorities") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form" };
  }

  const v = parsed.data;
  let interviewFocus: unknown = undefined;
  const focusRaw = formData.get("interview_focus");
  if (typeof focusRaw === "string" && focusRaw.trim()) {
    try {
      interviewFocus = JSON.parse(focusRaw);
    } catch {
      interviewFocus = undefined;
    }
  }

  const { data: before } = await supabase
    .from("jobs")
    .select("title, description, seniority, required_skills, hiring_priorities")
    .eq("id", jobId)
    .maybeSingle();

  const { error } = await supabase
    .from("jobs")
    .update({
      title: v.title,
      description: v.description,
      required_skills: v.required_skills,
      seniority: v.seniority,
      location: v.location,
      salary_min: v.salary_min ?? null,
      salary_max: v.salary_max ?? null,
      salary_currency: v.salary_currency,
      hiring_priorities: v.hiring_priorities ?? null,
      ...(interviewFocus !== undefined ? { interview_focus: interviewFocus } : {}),
    })
    .eq("id", jobId);

  if (error) return { error: error.message };

  const roleContextChanged =
    before &&
    (before.title !== v.title ||
      before.description !== v.description ||
      before.seniority !== v.seniority ||
      JSON.stringify(before.required_skills ?? []) !==
        JSON.stringify(v.required_skills ?? []) ||
      (before.hiring_priorities ?? "") !== (v.hiring_priorities ?? ""));

  if (roleContextChanged) {
    try {
      const draft = defaultInterviewQuestions({
        title: v.title,
        seniority: v.seniority,
        requiredSkills: v.required_skills,
      });
      await supabase
        .from("jobs")
        .update({ interview_questions: draft, ai_interview_plan_applied: false })
        .eq("id", jobId);
      // Enqueue happens on the job page to keep updates fast.
    } catch (e) {
      console.error("Regenerate interview plan failed", e);
    }
  }

  revalidatePath("/dashboard/jobs");
  revalidatePath(`/dashboard/jobs/${jobId}`);
  return { success: true as const };
}

export async function generateJobDraftFromTitleAction(input: {
  title: string;
  seniority: string;
  required_skills: string[];
  fields: "description" | "hiring_priorities" | "both";
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await ensureEmployer(user);

  try {
    const out = await generateJobFieldsFromTitle({
      title: input.title,
      seniority: input.seniority,
      requiredSkills: input.required_skills,
      fields: input.fields,
    });
    return {
      description: out.description,
      hiring_priorities: out.hiring_priorities,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generation failed";
    return { error: message };
  }
}

export async function runJobEnrichmentAction(input: {
  title: string;
  description: string;
  seniority: string;
  required_skills: string[];
  hiring_priorities?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await ensureEmployer(user);

  try {
    const out = await enrichJobDescription({
      title: input.title,
      description: input.description,
      seniority: input.seniority,
      requiredSkills: input.required_skills,
      hiringPriorities: input.hiring_priorities,
    });
    return {
      refined_description: out.refined_description,
      interview_focus_areas: out.interview_focus_areas,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Enrichment failed";
    return { error: message };
  }
}

export async function deleteJob(jobId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  await ensureEmployer(user);

  const { error } = await supabase.from("jobs").delete().eq("id", jobId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard/candidates");
  return {};
}
