"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensureEmployer } from "@/lib/services/employer";
import { sendInterviewInvite } from "@/lib/emails/send-invite";
import { getLimitsForTier } from "@/lib/billing/limits";
import { getOrCreateUsageRow, incrementInvites } from "@/lib/services/usage";

function parseEmails(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function inviteCandidatesToJob(jobId: string, emailsRaw: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const employer = await ensureEmployer(user);
  const emails = parseEmails(emailsRaw);
  if (emails.length === 0) return { error: "Add at least one email." };

  const limits = getLimitsForTier(employer.subscription_tier);
  const usage = await getOrCreateUsageRow(employer.id);
  if (usage.invites_count + emails.length > limits.maxInvitesPerMonth) {
    return {
      error: `Invite limit reached for your plan (${limits.maxInvitesPerMonth}/month). Upgrade to send more.`,
    };
  }

  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select("id, title, employer_id")
    .eq("id", jobId)
    .single();
  if (jobErr || !job || job.employer_id !== employer.id) {
    return { error: "Job not found." };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const companyName = employer.company_name || "Your company";

  let sent = 0;
  for (const email of emails) {
    const { data: existingCand } = await supabase
      .from("candidates")
      .select("id")
      .eq("employer_id", employer.id)
      .ilike("email", email)
      .maybeSingle();

    let candidateId = existingCand?.id;
    if (!candidateId) {
      const { data: cand, error: cErr } = await supabase
        .from("candidates")
        .insert({ employer_id: employer.id, email })
        .select("id")
        .single();
      if (cErr) return { error: cErr.message };
      candidateId = cand.id;
    }

    const { data: existingApp } = await supabase
      .from("applications")
      .select("id")
      .eq("job_id", jobId)
      .eq("candidate_id", candidateId)
      .maybeSingle();

    let applicationId = existingApp?.id;
    if (!applicationId) {
      const { data: app, error: aErr } = await supabase
        .from("applications")
        .insert({
          job_id: jobId,
          candidate_id: candidateId,
          status: "invited",
          stage: "screening",
        })
        .select("id")
        .single();
      if (aErr) return { error: aErr.message };
      applicationId = app.id;
    }

    const { data: existingSession } = await supabase
      .from("interview_sessions")
      .select("id, status, access_token")
      .eq("application_id", applicationId)
      .maybeSingle();

    let sessionId = existingSession?.id;
    let accessToken = (existingSession as { access_token?: string } | null)?.access_token;
    if (!existingSession) {
      const { data: sess, error: sErr } = await supabase
        .from("interview_sessions")
        .insert({
          application_id: applicationId,
          status: "pending",
        })
        .select("id, access_token")
        .single();
      if (sErr) return { error: sErr.message };
      sessionId = sess.id;
      accessToken = (sess as { access_token?: string }).access_token;
    }

    const tok = accessToken || "";
    const interviewUrl = `${appUrl.replace(/\/$/, "")}/interview/${sessionId}?t=${encodeURIComponent(tok)}`;
    try {
      await sendInterviewInvite({
        to: email,
        companyName,
        jobTitle: job.title,
        interviewUrl,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Email failed";
      return { error: msg };
    }
    sent += 1;
  }

  await incrementInvites(employer.id, sent);
  revalidatePath(`/dashboard/jobs/${jobId}`);
  revalidatePath("/dashboard/candidates");
  revalidatePath("/dashboard");
  return { success: true as const, count: sent };
}
