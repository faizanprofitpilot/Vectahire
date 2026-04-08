import { Resend } from "resend";

export async function sendInterviewInvite(params: {
  to: string;
  candidateName?: string | null;
  companyName: string;
  jobTitle: string;
  interviewUrl: string;
}) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) {
    console.warn("Resend not configured; skipping email");
    return { skipped: true as const };
  }

  const resend = new Resend(key);
  const greeting = params.candidateName?.trim()
    ? `Hi ${params.candidateName.trim()},`
    : "Hi,";

  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: `Your interview for ${params.jobTitle} at ${params.companyName}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 560px; line-height: 1.5;">
        <p>${greeting}</p>
        <p><strong>${params.companyName}</strong> invited you to complete a short AI-led voice and video interview for the <strong>${params.jobTitle}</strong> role.</p>
        <p>This is asynchronous, complete it when you are ready in a quiet space with your microphone and camera.</p>
        <p><a href="${params.interviewUrl}" style="display:inline-block;margin-top:12px;padding:12px 20px;background:#1e3a5f;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Start interview</a></p>
        <p style="font-size:13px;color:#666;margin-top:24px;">If the button does not work, paste this link into your browser:<br/>${params.interviewUrl}</p>
      </div>
    `,
  });

  if (error) throw new Error(error.message);
  return { skipped: false as const };
}
