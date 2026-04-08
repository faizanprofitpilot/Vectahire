import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Briefcase, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CandidateReviewTabs } from "@/components/candidates/candidate-review-tabs";
import { DeleteCandidateButton } from "@/components/candidates/delete-candidate-button";
import { createClient } from "@/lib/supabase/server";
import { ensureEmployer } from "@/lib/services/employer";
import { signInterviewVideoUrl } from "@/lib/supabase/storage-sign";
import {
  pickScore,
  pickSession,
  pipelineHeadline,
  verdictLabel,
  type SessionShape,
} from "@/lib/employer/pipeline-status";
import { cn } from "@/lib/utils";

function verdictBadgeClass(verdict: string): string {
  if (verdict === "strong_hire" || verdict === "hire") {
    return "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-950 dark:text-emerald-100";
  }
  if (verdict === "maybe") {
    return "border-amber-500/30 bg-amber-500/[0.09] text-amber-950 dark:text-amber-100";
  }
  return "border-rose-500/25 bg-rose-500/[0.06] text-rose-950 dark:text-rose-100";
}

function initialFromName(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  return t[0]!.toUpperCase();
}

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const employer = await ensureEmployer(user);

  const { data: application, error } = await supabase
    .from("applications")
    .select(
      `
      id,
      status,
      stage,
      candidates ( id, full_name, email, phone ),
      jobs!inner ( id, title, description, employer_id ),
      interview_sessions (
        id,
        status,
        video_storage_path,
        duration_seconds,
        scoring_status,
        interview_transcripts ( sequence, question_text, answer_text, is_follow_up, asked_at, answered_at ),
        interview_scores (
          overall_score,
          communication_score,
          role_fit_score,
          problem_solving_score,
          experience_score,
          confidence_score,
          strengths,
          weaknesses,
          risks,
          summary,
          final_verdict
        )
      )
    `,
    )
    .eq("id", id)
    .single();

  if (error || !application) notFound();

  const app = application as unknown as {
    id: string;
    status: string;
    stage: string;
    candidates: {
      id: string;
      full_name: string | null;
      email: string;
      phone: string | null;
    } | null;
    jobs: { id: string; title: string; description: string; employer_id: string };
    interview_sessions: unknown;
  };

  if (app.jobs.employer_id !== employer.id) notFound();

  const session = pickSession(app.interview_sessions as SessionShape | SessionShape[] | null);
  const rawTranscripts = session?.interview_transcripts ?? [];
  const transcriptRows = (
    Array.isArray(rawTranscripts) ? rawTranscripts : [rawTranscripts]
  ).filter(Boolean) as {
    sequence: number;
    question_text: string;
    answer_text: string;
    is_follow_up: boolean;
    asked_at: string;
    answered_at: string | null;
  }[];
  const transcripts = transcriptRows.slice().sort((a, b) => a.sequence - b.sequence);

  type ScoreRow = {
    overall_score: number;
    communication_score: number;
    role_fit_score: number;
    problem_solving_score: number;
    experience_score: number;
    confidence_score: number;
    strengths: string[];
    weaknesses: string[];
    risks: string[];
    summary: string;
    final_verdict: string;
  };

  const score: ScoreRow | null = pickScore(session?.interview_scores) as ScoreRow | null;

  let videoUrl: string | null = null;
  if (session?.video_storage_path) {
    videoUrl = await signInterviewVideoUrl(session.video_storage_path);
  }

  const name = app.candidates?.full_name?.trim() || "Candidate";
  const email = app.candidates?.email ?? "";
  const statusLine = pipelineHeadline({
    interview_sessions: app.interview_sessions as SessionShape | SessionShape[] | null,
  });
  const concern = score?.weaknesses?.[0] ?? score?.risks?.[0] ?? null;

  const breakdownRows = score
    ? [
        { label: "Communication", value: score.communication_score },
        { label: "Role fit", value: score.role_fit_score },
        { label: "Problem solving", value: score.problem_solving_score },
        { label: "Experience", value: score.experience_score },
        { label: "Confidence", value: score.confidence_score },
      ]
    : [];

  const summaryTab = (
    <div className="px-5 py-8 sm:px-8">
      {score ? (
        <div className="mx-auto max-w-prose">
          <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Interview insights
          </p>
          <p className="mt-4 text-[15px] leading-[1.7] text-foreground/95">{score.summary}</p>
          {concern ? (
            <aside className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-3.5 text-sm leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Follow up in live round — </span>
              {concern}
            </aside>
          ) : null}
        </div>
      ) : (
        <div className="mx-auto max-w-prose rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-12 text-center text-sm leading-relaxed text-muted-foreground">
          {session?.scoring_status === "failed" ? (
            <p>Scoring did not complete. Re-run scoring or have the candidate retake if needed.</p>
          ) : session?.status === "completed" ? (
            <p>Scores will appear here shortly after processing finishes.</p>
          ) : (
            <p>
              Scores and recommendations appear after the interview is completed and scored.
              <span className="mt-2 block text-foreground">Current status: {statusLine}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );

  const transcriptTab = (
    <div className="space-y-4 px-5 py-8 sm:px-8">
      {transcripts.length === 0 ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Transcript turns appear here as the candidate completes each interview question.
        </p>
      ) : (
        transcripts.map((t) => (
          <div
            key={t.sequence}
            className="rounded-xl border border-border/50 bg-muted/[0.35] px-4 py-4 sm:px-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-background/80 px-2 py-0.5 font-mono text-[11px] font-medium tabular-nums text-muted-foreground">
                Q{t.sequence}
              </span>
              {t.is_follow_up ? (
                <Badge variant="outline" className="text-[10px] font-normal">
                  Follow-up
                </Badge>
              ) : null}
            </div>
            <p className="mt-3 text-[15px] font-medium leading-snug text-foreground">{t.question_text}</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {t.answer_text || "—"}
            </p>
          </div>
        ))
      )}
    </div>
  );

  const videoTab = (
    <div className="px-5 py-8 sm:px-8">
      {videoUrl ? (
        <video
          src={videoUrl}
          controls
          className="aspect-video w-full max-w-3xl rounded-xl border border-border/60 bg-black shadow-lg"
          playsInline
        />
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {session?.status === "completed"
            ? "No recording is attached to this session."
            : "Recording is available after the candidate completes the interview."}
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/25">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/dashboard/candidates"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4 shrink-0" aria-hidden />
          Candidates
        </Link>

        <article className="mt-8 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_2px_oklch(0_0_0/0.04),0_12px_40px_-16px_oklch(0.25_0.04_260/0.12)]">
          {/* Identity */}
          <div className="border-b border-border/50 bg-card px-5 py-6 sm:px-8 sm:py-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-4">
                <div
                  className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[oklch(0.94_0.04_260)] text-lg font-semibold text-[oklch(0.35_0.1_260)] shadow-inner"
                  aria-hidden
                >
                  {initialFromName(name)}
                </div>
                <div className="min-w-0 space-y-3">
                  <div>
                    <h1 className="font-[family-name:var(--font-display-marketing)] text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight">
                      {name}
                    </h1>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="size-3.5 shrink-0 opacity-70" aria-hidden />
                        {email}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Link
                      href={`/dashboard/jobs/${app.jobs.id}`}
                      className="inline-flex items-center gap-1.5 font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      <Briefcase className="size-3.5 shrink-0 opacity-70" aria-hidden />
                      {app.jobs.title}
                    </Link>
                    <Separator orientation="vertical" className="hidden h-4 sm:block" />
                    <Badge variant="secondary" className="font-normal text-muted-foreground">
                      {statusLine}
                    </Badge>
                  </div>
                </div>
              </div>
              {app.candidates?.id ? (
                <div className="shrink-0 sm:pt-1">
                  <DeleteCandidateButton candidateId={app.candidates.id} displayName={name} />
                </div>
              ) : null}
            </div>
          </div>

          {/* Scores — single band, no competing sidebar */}
          {score ? (
            <div className="border-b border-border/50 bg-gradient-to-b from-muted/50 to-muted/20 px-5 py-8 sm:px-8">
              <div className="grid gap-10 lg:grid-cols-[minmax(0,200px)_1fr] lg:items-start lg:gap-12">
                <div className="space-y-4">
                  <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Overall score
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="font-[family-name:var(--font-display-marketing)] text-5xl font-semibold tabular-nums tracking-tight text-foreground sm:text-6xl">
                      {score.overall_score}
                    </span>
                    <span className="text-lg font-medium text-muted-foreground">/100</span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-background/80"
                    role="presentation"
                    aria-hidden
                  >
                    <div
                      className="h-full rounded-full bg-foreground/75 transition-[width]"
                      style={{ width: `${Math.min(100, Math.max(0, score.overall_score))}%` }}
                    />
                  </div>
                  <div className="pt-1">
                    <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      Recommendation
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "mt-2 border px-3 py-1.5 text-sm font-semibold normal-case",
                        verdictBadgeClass(score.final_verdict),
                      )}
                    >
                      {verdictLabel(score.final_verdict)}
                    </Badge>
                  </div>
                </div>

                <div className="min-w-0 space-y-8">
                  <div>
                    <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      Score breakdown
                    </p>
                    <dl className="mt-4 divide-y divide-border/60 rounded-xl border border-border/50 bg-background/60">
                      {breakdownRows.map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between gap-4 px-4 py-3 text-sm first:rounded-t-[inherit] last:rounded-b-[inherit]"
                        >
                          <dt className="text-muted-foreground">{row.label}</dt>
                          <dd className="tabular-nums text-base font-semibold text-foreground">
                            {row.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      Each category is out of 100. Overall score is the average of these five — not
                      their sum.
                    </p>
                  </div>
                  {score.strengths?.length ? (
                    <div>
                      <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        Strongest signals
                      </p>
                      <ul className="mt-4 flex flex-wrap gap-2">
                        {score.strengths.slice(0, 6).map((s) => (
                          <li key={s}>
                            <span className="inline-flex rounded-lg border border-border/60 bg-background/80 px-3 py-1.5 text-sm font-medium text-foreground/90">
                              {s}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>

              {(score.weaknesses?.length || score.risks?.length) ? (
                <div className="mt-10 grid gap-8 border-t border-border/40 pt-10 md:grid-cols-2 md:gap-10">
                  {score.weaknesses?.length ? (
                    <section className="min-w-0">
                      <h3 className="text-[13px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        Gaps
                      </h3>
                      <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
                        {score.weaknesses.map((s) => (
                          <li key={s} className="flex gap-3 pl-0.5">
                            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/45" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                  {score.risks?.length ? (
                    <section className="min-w-0">
                      <h3 className="text-[13px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        Risks
                      </h3>
                      <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
                        {score.risks.map((s) => (
                          <li key={s} className="flex gap-3 pl-0.5">
                            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/45" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Interview record */}
          <div className="bg-card">
            <div className="px-5 pt-7 sm:px-8 sm:pt-8">
              <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Interview record
              </p>
              <div className="mt-6">
                <CandidateReviewTabs summary={summaryTab} transcript={transcriptTab} video={videoTab} />
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
