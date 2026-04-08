import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DeleteJobButton } from "@/components/jobs/delete-job-button";
import { JobsEmptyState } from "@/components/jobs/jobs-empty-state";
import { createClient } from "@/lib/supabase/server";
import { ensureEmployer } from "@/lib/services/employer";
import { getEmployerJobsWithStats } from "@/lib/services/jobs-overview";

export default async function JobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const employer = await ensureEmployer(user);

  const rows = await getEmployerJobsWithStats(employer.id);

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <DashboardPageHeader
        title="Roles"
        description="Create roles, invite candidates, review ranked results, one workspace per opening."
        actions={
          <Button asChild className="gap-2 rounded-full px-5 shadow-md shadow-primary/15">
            <Link href="/dashboard/jobs/new">
              <Plus className="size-4" />
              New job
            </Link>
          </Button>
        }
      />

      {!rows.length ? (
        <JobsEmptyState />
      ) : (
        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card/40 shadow-sm">
          <div className="border-b border-border/60 px-4 py-3 sm:px-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Hiring pipeline
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Open a role to work candidates and scores in one place.
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Role</TableHead>
                <TableHead className="hidden sm:table-cell">Level</TableHead>
                <TableHead className="hidden md:table-cell">Location</TableHead>
                <TableHead className="text-right tabular-nums">Candidates</TableHead>
                <TableHead className="text-right tabular-nums">Completed</TableHead>
                <TableHead className="text-right tabular-nums">Top score</TableHead>
                <TableHead className="hidden lg:table-cell">Leading signal</TableHead>
                <TableHead className="w-12 text-right">
                  <span className="sr-only">Delete</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/jobs/${j.id}`}
                      className="text-[oklch(0.28_0.08_260)] hover:underline"
                    >
                      {j.title}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className="font-normal">
                      {j.seniority}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden max-w-[140px] truncate text-muted-foreground md:table-cell">
                    {j.location || "-"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {j.candidateCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {j.completedInterviewCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {j.topScore != null ? (
                      <span className="font-semibold text-foreground">{j.topScore}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden max-w-[180px] truncate text-sm text-muted-foreground lg:table-cell">
                    {j.leadingCandidate ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DeleteJobButton jobId={j.id} jobTitle={j.title} variant="icon" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}
    </div>
  );
}
