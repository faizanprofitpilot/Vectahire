import { createClient } from "@/lib/supabase/server";
import { currentPeriodStart } from "@/lib/billing/limits";

export async function getOrCreateUsageRow(employerId: string) {
  const supabase = await createClient();
  const period = currentPeriodStart();
  const { data: existing } = await supabase
    .from("employer_usage")
    .select("*")
    .eq("employer_id", employerId)
    .eq("period_start", period)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("employer_usage")
    .insert({
      employer_id: employerId,
      period_start: period,
      interviews_count: 0,
      invites_count: 0,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function incrementInvites(employerId: string, delta: number) {
  const supabase = await createClient();
  const row = await getOrCreateUsageRow(employerId);
  const { error } = await supabase
    .from("employer_usage")
    .update({ invites_count: row.invites_count + delta })
    .eq("id", row.id);
  if (error) throw error;
}

export async function incrementInterviewsCompleted(employerId: string) {
  const supabase = await createClient();
  const row = await getOrCreateUsageRow(employerId);
  const { error } = await supabase
    .from("employer_usage")
    .update({ interviews_count: row.interviews_count + 1 })
    .eq("id", row.id);
  if (error) throw error;
}
