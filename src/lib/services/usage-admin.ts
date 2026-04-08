import { createAdminClient } from "@/lib/supabase/admin";
import { currentPeriodStart } from "@/lib/billing/limits";

export async function incrementInterviewsCompletedAdmin(employerId: string) {
  const admin = createAdminClient();
  const period = currentPeriodStart();

  const { data: existing } = await admin
    .from("employer_usage")
    .select("*")
    .eq("employer_id", employerId)
    .eq("period_start", period)
    .maybeSingle();

  if (existing) {
    await admin
      .from("employer_usage")
      .update({ interviews_count: existing.interviews_count + 1 })
      .eq("id", existing.id);
    return;
  }

  await admin.from("employer_usage").insert({
    employer_id: employerId,
    period_start: period,
    interviews_count: 1,
    invites_count: 0,
  });
}
