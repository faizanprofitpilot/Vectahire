"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensureEmployer } from "@/lib/services/employer";

export async function deleteCandidate(candidateId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  await ensureEmployer(user);

  const { error } = await supabase.from("candidates").delete().eq("id", candidateId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard/candidates");
  return {};
}

/** Removes this candidate from a single role (application row). Sessions and scores cascade. */
export async function deleteApplication(applicationId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  await ensureEmployer(user);

  const { error } = await supabase.from("applications").delete().eq("id", applicationId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard/candidates");
  return {};
}

export async function setApplicationShortlisted(
  applicationId: string,
  shortlisted: boolean,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  await ensureEmployer(user);

  const { error } = await supabase
    .from("applications")
    .update({ shortlisted })
    .eq("id", applicationId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/candidates");
  revalidatePath(`/dashboard/candidates/${applicationId}`);
  return {};
}
