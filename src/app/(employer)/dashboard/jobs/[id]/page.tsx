import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { ensureEmployer } from "@/lib/services/employer";
import { InviteCandidatesDialog } from "@/components/jobs/invite-candidates-dialog";
import { DeleteJobButton } from "@/components/jobs/delete-job-button";
import { RemoveFromJobButton } from "@/components/jobs/remove-from-job-button";
import { summarizeCandidateComparison } from "@/lib/ai/job-comparison";
import { parseInterviewQuestions } from "@/lib/jobs/interview-questions";
import { isAudioReadyForQuestions } from "@/lib/jobs/interview-audio";
import { InterviewQuestionsPanel } from "@/components/jobs/interview-questions-panel";
import { JobBuildPlanKickoff } from "@/components/jobs/job-build-plan-kickoff";
import {
  pickScore,
  pickSession,
  pipelineHeadline,
  verdictLabel,
  isStrongVerdict,
  type SessionShape,
} from "@/lib/employer/pipeline-status";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 font-[family-name:var(--font-display-marketing)] text-2xl font-semibold tabular-nums tracking-tight text-[oklch(0.16_0.05_260)]">
        {value}
      </p>
    </div>
  );
}

type AppRow = {
  id: string;
  updated_at: string;
  candidates: { id: string; full_name: string | null; email: string } | null;
  interview_sessions: unknown;
};

export default async function JobDetailPage({
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

  const { data: job, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .eq("employer_id", employer.id)
    .single();

  if (error || !job) notFound();

  const { data: applications } = await supabase
    .from("applications")
    .select(
      `
      id,
      updated_at,
      candidates ( id, full_name, email ),
      interview_sessions (
        id,
        status,
        scoring_status,
        ended_at,
        updated_at,
        interview_scores ( overall_score, final_verdict, summary )
      )
    `,
    )
    .eq("job_id", id)
    .order("updated_at", { ascending: false });

  const appRows = (applications ?? []) as unknown as AppRow[];

  const { data: rankings } = await supabase
    .from("job_candidate_rankings")
    .select(
      `
      rank,
      overall_score,
      application_id,
      applications (
        id,
        candidates ( id, full_name, email ),
        interview_sessions (
          interview_scores ( final_verdict, summary )
        )
      )
    `,
    )
    .eq("job_id", id)
    .order("rank", { ascending: true });

  type RankRow = {
    rank: number;
    overall_score: number;
    application_id: string;
    applications: {
      id: string;
      candidates: { full_name: string | null; email: string } | null;
      interview_sessions: unknown;
    } | null;
  };

  const rankRows = (rankings ?? []) as unknown as RankRow[];

  const comparisonPayload = rankRows.slice(0, 5).map((r) => {
    const sessRaw = r.applications?.interview_sessions;
    const sess = Array.isArray(sessRaw) ? sessRaw[0] : sessRaw;
    const sc = sess?.interview_scores;
    const scOne = Array.isArray(sc) ? sc[0] : sc;
    const name = r.applications?.candidates?.full_name?.trim() || "Candidate";
    return {
      name,
      score: r.overall_score,
      verdict: scOne?.final_verdict ?? "-",
      summary: scOne?.summary ?? "",
    };
  });

  const comparisonText =
    comparisonPayload.length >= 2
      ? await summarizeCandidateComparison({
          jobTitle: job.title,
          candidates: comparisonPayload,
        })
      : "";

  const skills = Array.isArray(job.required_skills)
    ? (job.required_skills as string[])
    : [];

  const parsedQuestions = parseInterviewQuestions(job.interview_questions);
  const audioReady = isAudioReadyForQuestions(parsedQuestions);

  let completedInterviews = 0;
  let strongCount = 0;
  for (const a of appRows) {
    const sess = pickSession(a.interview_sessions as SessionShape | SessionShape[] | null);
    if (sess?.status === "completed") {
      completedInterviews += 1;
      const sc = pickScore(sess.interview_scores);
      if (sc?.final_verdict && isStrongVerdict(sc.final_verdict)) strongCount += 1;
    }
  }

  const needsReview = appRows.filter((a) => {
    const sess = pickSession(a.interview_sessions as SessionShape | SessionShape[] | null);
    if (!sess || sess.status !== "completed") return false;
    return !pickScore(sess.interview_scores);
  }).length;

  const topRank = rankRows[0];
  const topName =
    topRank?.applications?.candidates?.full_name ||
    topRank?.applications?.candidates?.email ||
    null;

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-12">
      {!audioReady ? <JobBuildPlanKickoff jobId={job.id} /> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" asChild className="gap-2 rounded-full">
          <Link href="/dashboard/jobs">
            <ArrowLeft className="size-4" />
            Roles
          </Link>
        </Button>
      </div>

      <header className="space-y-6 border-b border-border/60 pb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <h1 className="font-[family-name:var(--font-display-marketing)] text-3xl font-medium tracking-tight text-[oklch(0.16_0.05_260)] sm:text-4xl">
              {job.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {[job.location || null, job.seniority].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <InviteCandidatesDialog
              jobId={job.id}
              disabled={!audioReady}
              disabledHint="Preparing interview audio. You can edit questions now; invites unlock when audio is ready."
            />
            <DeleteJobButton jobId={job.id} jobTitle={job.title} />
          </div>
        </div>

        <div className="flex flex-wrap gap-8 gap-y-6 sm:gap-10">
          <Stat label="Candidates" value={appRows.length} />
          <Stat label="Completed interviews" value={completedInterviews} />
          <Stat label="Strong signals" value={strongCount} />
          <Stat label="Needs review" value={needsReview} />
        </div>
      </header>

      {(topName || needsReview > 0) && (
        <div className="rounded-xl border border-border/70 bg-[oklch(0.98_0.008_250)] px-4 py-3 text-sm leading-relaxed">
          {topName ? (
            <p>
              <span className="font-medium text-foreground">Recommended to review first: </span>
              <Link
                href={`/dashboard/candidates/${topRank.application_id}`}
                className="text-[oklch(0.28_0.08_260)] underline-offset-4 hover:underline"
              >
                {topName}
              </Link>
              {topRank ? (
                <span className="text-muted-foreground">
                  {" "}
                  · score {topRank.overall_score}
                </span>
              ) : null}
            </p>
          ) : null}
          {needsReview > 0 ? (
            <p className={topName ? "mt-1 text-muted-foreground" : "text-muted-foreground"}>
              {needsReview} interview{needsReview === 1 ? "" : "s"} still need scoring or a quick
              pass in the list below.
            </p>
          ) : null}
        </div>
      )}

      {comparisonText ? (
        <div className="rounded-xl border border-border/60 bg-card/60 px-5 py-4 text-sm leading-relaxed text-muted-foreground">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            How they compare
          </p>
          <p className="mt-2 text-foreground/90">{comparisonText}</p>
        </div>
      ) : null}

      <InterviewQuestionsPanel
        jobId={job.id}
        initialQuestions={parsedQuestions}
      />

      <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,280px)] lg:items-start">
        <section className="min-w-0 space-y-4">
          <div>
            <h2 className="font-[family-name:var(--font-display-marketing)] text-xl font-medium tracking-tight text-[oklch(0.2_0.045_260)]">
              Candidates for this role
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Status, score, and verdict, open a row for full interview insights.
            </p>
          </div>

          {appRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
              <p className="font-medium text-foreground">Invite your first candidate</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Ranked scores and comparison notes appear here after interviews finish and are
                scored.
              </p>
              <div className="mt-6 flex justify-center">
                <InviteCandidatesDialog
                  jobId={job.id}
                  disabled={!audioReady}
                  disabledHint="Preparing interview audio. You can edit questions now; invites unlock when audio is ready."
                />
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/80">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Candidate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead>Verdict</TableHead>
                    <TableHead className="text-right">Last activity</TableHead>
                    <TableHead className="w-[7.5rem] text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appRows.map((r) => {
                    const sess = pickSession(
                      r.interview_sessions as SessionShape | SessionShape[] | null,
                    );
                    const sc = pickScore(sess?.interview_scores);
                    const name = r.candidates?.full_name?.trim() || "-";
                    const activity = sess?.ended_at || sess?.updated_at || r.updated_at;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/dashboard/candidates/${r.id}`}
                            className="text-[oklch(0.28_0.08_260)] hover:underline"
                          >
                            {name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {pipelineHeadline({ interview_sessions: r.interview_sessions })}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {typeof sc?.overall_score === "number" ? (
                            <span className="font-semibold">{sc.overall_score}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {sc?.final_verdict ? (
                            <Badge variant="secondary" className="font-normal">
                              {verdictLabel(sc.final_verdict)}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {activity ? new Date(activity).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.candidates?.id ? (
                            <RemoveFromJobButton
                              applicationId={r.id}
                              candidateName={name}
                            />
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <details className="group rounded-xl border border-border/80 bg-card/50 open:bg-card">
            <summary className="cursor-pointer list-none px-4 py-3 font-medium text-foreground outline-none marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-2">
                Role brief
                <span className="text-xs font-normal text-muted-foreground group-open:hidden">
                  Show
                </span>
                <span className="hidden text-xs font-normal text-muted-foreground group-open:inline">
                  Hide
                </span>
              </span>
            </summary>
            <div className="space-y-3 border-t border-border/60 px-4 py-4 text-sm leading-relaxed text-muted-foreground">
              <p className="whitespace-pre-wrap text-foreground/90">{job.description}</p>
              {skills.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Skills
                  </p>
                  <p className="mt-1">{skills.join(", ")}</p>
                </div>
              ) : null}
              {job.hiring_priorities ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Priorities
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{job.hiring_priorities}</p>
                </div>
              ) : null}
            </div>
          </details>
        </aside>
      </div>
    </div>
  );
}
