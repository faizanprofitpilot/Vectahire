import { InterviewClient } from "@/components/interview/interview-client";
import { INTERVIEW_TOKEN_QUERY_PARAM } from "@/lib/interview/session-auth";

export default async function InterviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { sessionId } = await params;
  const sp = (await searchParams) ?? {};
  const raw = sp[INTERVIEW_TOKEN_QUERY_PARAM];
  const token = Array.isArray(raw) ? raw[0] : raw;
  return <InterviewClient sessionId={sessionId} token={token ?? ""} />;
}
