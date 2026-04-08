"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureEmployer } from "@/lib/services/employer";

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const companyName = String(formData.get("company_name") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!companyName || !fullName) {
    redirect("/onboarding?error=required");
  }

  await ensureEmployer(user);

  const { error } = await supabase
    .from("employers")
    .update({
      company_name: companyName,
      full_name: fullName,
      onboarding_completed: true,
    })
    .eq("user_id", user.id);

  if (error) {
    redirect("/onboarding?error=save");
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
