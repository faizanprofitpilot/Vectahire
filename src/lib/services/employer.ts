import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type EmployerRow = Database["public"]["Tables"]["employers"]["Row"];

export async function getEmployerForUser(
  userId: string,
): Promise<EmployerRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employers")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function ensureEmployer(user: User): Promise<EmployerRow> {
  const supabase = await createClient();
  const existing = await getEmployerForUser(user.id);
  if (existing) return existing;

  const email = user.email ?? "";
  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    email.split("@")[0] ??
    "";

  const { data: created, error } = await supabase
    .from("employers")
    .insert({
      user_id: user.id,
      email,
      full_name: fullName,
      company_name: "",
      onboarding_completed: false,
    })
    .select("*")
    .single();

  if (error) throw error;

  await supabase.from("employer_subscriptions").insert({
    employer_id: created.id,
    tier: "free",
    status: "active",
  });

  const periodStart = new Date();
  periodStart.setDate(1);
  periodStart.setHours(0, 0, 0, 0);
  await supabase.from("employer_usage").insert({
    employer_id: created.id,
    period_start: periodStart.toISOString().slice(0, 10),
    interviews_count: 0,
    invites_count: 0,
  });

  return created;
}
