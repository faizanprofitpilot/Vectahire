import Link from "next/link";
import { Suspense } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { CandidatesPipelineFilters } from "@/components/candidates/candidates-pipeline-filters";
import { DeleteCandidateButton } from "@/components/candidates/delete-candidate-button";
import { ShortlistToggle } from "@/components/candidates/shortlist-toggle";
import { createClient } from "@/lib/supabase/server";
import { ensureEmployer } from "@/lib/services/employer";
import {
  pickScore,
  pickSession,
  pipelineBucketFromRow,
  pipelineHeadline,
  verdictLabel,
  type SessionShape,
} from "@/lib/employer/pipeline-status";

type AppRow = {
  id: string;
  status: string;
  updated_at: string;
  candidates: { id: string; full_name: string | null; email: string } | null;
  jobs: { id: string; title: string; employer_id: string };
  shortlisted: boolean;
  interview_sessions: unknown;
};

function sortRows(rows: AppRow[], sort: string): AppRow[] {
  const copy = [...rows];
  if (sort === "score_desc") {
    copy.sort((a, b) => {
      const sa = pickScore(
        pickSession(a.interview_sessions as SessionShape | SessionShape[] | null)
          ?.interview_scores,
      )?.overall_score;
      const sb = pickScore(
        pickSession(b.interview_sessions as SessionShape | SessionShape[] | null)
          ?.interview_scores,
      )?.overall_score;
      if (sa == null && sb == null) return 0;
      if (sa == null) return 1;
      if (sb == null) return -1;
      return sb - sa;
    });
  } else if (sort === "score_asc") {
    copy.sort((a, b) => {
      const sa = pickScore(
        pickSession(a.interview_sessions as SessionShape | SessionShape[] | null)
          ?.interview_scores,
      )?.overall_score;
      const sb = pickScore(
        pickSession(b.interview_sessions as SessionShape | SessionShape[] | null)
          ?.interview_scores,
      )?.overall_score;
      if (sa == null && sb == null) return 0;
      if (sa == null) return 1;
      if (sb == null) return -1;
      return sa - sb;
    });
  } else {
    copy.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
  }
  return copy;
}

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string; status?: string; verdict?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const employer = await ensureEmployer(user);

  const { data: jobRows } = await supabase
    .from("jobs")
    .select("id, title")
    .eq("employer_id", employer.id)
    .order("created_at", { ascending: false });
  const jobOptions = (jobRows ?? []) as { id: string; title: string }[];
  const jobIds = jobOptions.map((j) => j.id);

  if (jobIds.length === 0) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <DashboardPageHeader
          title="Candidates"
          description="Create a role first, then every invite shows up in this pipeline."
        />
      </div>
    );
  }

  const jobFilter = sp.job;

  const baseSelect = `
      id,
      status,
      updated_at,
      candidates ( id, full_name, email ),
      jobs!inner ( id, title, employer_id ),
      interview_sessions (
        id,
        status,
        scoring_status,
        ended_at,
        updated_at,
        interview_scores ( overall_score, final_verdict )
      )
    `;

  // `shortlisted` is a new column (migration 005). If the DB isn't migrated yet,
  // the select will fail and hide all candidates — so we fall back gracefully.
  const selectWithShortlist = `
      id,
      status,
      updated_at,
      shortlisted,
      candidates ( id, full_name, email ),
      jobs!inner ( id, title, employer_id ),
      interview_sessions (
        id,
        status,
        scoring_status,
        ended_at,
        updated_at,
        interview_scores ( overall_score, final_verdict )
      )
    `;

  let query = supabase.from("applications").select(selectWithShortlist).in("job_id", jobIds);

  if (jobFilter && jobIds.includes(jobFilter)) {
    query = query.eq("job_id", jobFilter);
  }

  let applications: unknown[] | null = null;
  {
    const res = await query.order("updated_at", { ascending: false });
    if (!res.error) {
      applications = res.data as unknown[] | null;
    } else {
      const fallbackQuery = supabase
        .from("applications")
        .select(baseSelect)
        .in("job_id", jobIds);
      const res2 = await (jobFilter && jobIds.includes(jobFilter)
        ? fallbackQuery.eq("job_id", jobFilter)
        : fallbackQuery
      ).order("updated_at", { ascending: false });
      applications = (res2.data as unknown[] | null) ?? [];
    }
  }

  let rows = (applications ?? []) as unknown as AppRow[];

  const statusFilter = sp.status ?? "all";
  if (statusFilter !== "all") {
    rows = rows.filter((r) => pipelineBucketFromRow(r) === statusFilter);
  }

  const verdictFilter = sp.verdict ?? "all";
  if (verdictFilter !== "all") {
    rows = rows.filter((r) => {
      const sess = pickSession(r.interview_sessions as SessionShape | SessionShape[] | null);
      const sc = pickScore(sess?.interview_scores);
      return sc?.final_verdict === verdictFilter;
    });
  }

  rows = sortRows(rows, sp.sort ?? "updated");

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <DashboardPageHeader
        title="Candidates"
        description="Everyone across your roles, filter by opening, status, and verdict to decide who to move forward."
      />

      <Suspense
        fallback={<div className="h-16 animate-pulse rounded-lg bg-muted/40" aria-hidden />}
      >
        <CandidatesPipelineFilters jobs={jobOptions} />
      </Suspense>

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card/40">
        {rows.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-muted-foreground">
            No candidates match these filters. Adjust filters or invite from a role page.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10">
                  <span className="sr-only">Shortlist</span>
                </TableHead>
                <TableHead>Candidate</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead>Verdict</TableHead>
                <TableHead className="text-right">Updated</TableHead>
                <TableHead className="w-12 text-right">
                  <span className="sr-only">Delete</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const sess = pickSession(
                  r.interview_sessions as SessionShape | SessionShape[] | null,
                );
                const sc = pickScore(sess?.interview_scores);
                const name = r.candidates?.full_name || "-";
                const email = r.candidates?.email || "-";
                return (
                  <TableRow key={r.id}>
                    <TableCell className="pr-0">
                      <ShortlistToggle applicationId={r.id} shortlisted={!!r.shortlisted} />
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/candidates/${r.id}`}
                        className="text-[oklch(0.28_0.08_260)] hover:underline"
                      >
                        <span className="block max-w-[220px] truncate">{name}</span>
                      </Link>
                      <span className="mt-1 block truncate text-xs text-muted-foreground sm:hidden">
                        {email}
                      </span>
                    </TableCell>
                    <TableCell className="hidden max-w-[220px] truncate text-muted-foreground sm:table-cell">
                      {email}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-muted-foreground">
                      <Link
                        href={`/dashboard/jobs/${r.jobs.id}`}
                        className="hover:text-foreground hover:underline"
                      >
                        {r.jobs.title}
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
                      {new Date(r.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.candidates?.id ? (
                        <DeleteCandidateButton
                          candidateId={r.candidates.id}
                          displayName={name === "-" ? email : name}
                          variant="icon"
                        />
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
