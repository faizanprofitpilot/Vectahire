import Link from "next/link";
import { ArrowRight, Briefcase, Mic, Sparkles, Trophy, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { DashboardActivationSection } from "@/components/dashboard/dashboard-activation-section";
import { DemoModeBanner } from "@/components/dashboard/demo-mode-banner";
import { createClient } from "@/lib/supabase/server";
import { ensureEmployer } from "@/lib/services/employer";
import { getDashboardSnapshot } from "@/lib/services/dashboard";
import { getDemoDashboardSnapshot } from "@/lib/dashboard/demo-snapshot";
import { getActivationProgress } from "@/lib/dashboard/activation";
import { cn } from "@/lib/utils";

const metricWells = [
  "bg-[oklch(0.93_0.04_280)] text-[oklch(0.4_0.14_280)]",
  "bg-[oklch(0.93_0.04_200)] text-[oklch(0.38_0.12_200)]",
  "bg-[oklch(0.93_0.04_160)] text-[oklch(0.38_0.1_160)]",
  "bg-[oklch(0.96_0.06_95)] text-[oklch(0.45_0.12_75)]",
] as const;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const sp = await searchParams;
  const isDemo = sp.demo === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const employer = await ensureEmployer(user);
  const snap = isDemo ? getDemoDashboardSnapshot() : await getDashboardSnapshot(employer.id);
  const activation = getActivationProgress(snap);
  const showActivation = !isDemo && activation.completedCount < activation.totalSteps;

  const metrics = [
    {
      label: "Open roles",
      value: snap.activeJobs,
      icon: Briefcase,
      hint: "Where you run screens",
    },
    {
      label: "Interviews live",
      value: snap.inProgress,
      icon: Mic,
      hint: "Candidates mid-session",
    },
    {
      label: "Completed & scored",
      value: snap.completed,
      icon: Trophy,
      hint: "Ready for your verdict",
    },
    {
      label: "Waiting to start",
      value: snap.pendingInvites,
      icon: UserPlus,
      hint: "Invited, not started",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-12">
      {isDemo ? <DemoModeBanner /> : null}

      <DashboardPageHeader
        title="Overview"
        description="Who to move forward, and what to open next."
        actions={
          <Button
            asChild
            size="lg"
            className="rounded-full px-6 shadow-lg shadow-[oklch(0.28_0.08_260)]/20"
          >
            <Link href="/dashboard/jobs/new" className="gap-2">
              New job
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      {showActivation ? <DashboardActivationSection activation={activation} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m, i) => (
          <Card key={m.label} className="overflow-hidden border-border/70 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{m.label}</CardTitle>
              <div
                className={cn(
                  "flex size-9 items-center justify-center rounded-xl",
                  metricWells[i % metricWells.length],
                )}
              >
                <m.icon className="size-[18px]" strokeWidth={1.75} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="font-[family-name:var(--font-display-marketing)] text-4xl font-semibold tabular-nums tracking-tight text-[oklch(0.14_0.05_260)]">
                {m.value}
              </p>
              <p className="mt-1.5 text-xs font-medium text-muted-foreground">{m.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/80 bg-card/50 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-[family-name:var(--font-display-marketing)] text-lg font-medium tracking-tight">
                Strongest signals
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Top scores across your roles, open to decide who advances.
              </p>
            </div>
            <Sparkles className="size-5 shrink-0 text-[oklch(0.5_0.14_200)]" />
          </div>
          <div className="mt-6">
            {snap.topRanked.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Completed interviews with scores will surface here for quick triage.
              </p>
            ) : (
              <ul className="space-y-2">
                {snap.topRanked.map((row) => (
                  <li key={row.id}>
                    {isDemo ? (
                      <span className="flex items-center justify-between rounded-xl border border-dashed border-border/60 px-3 py-2.5 text-sm">
                        <span className="font-medium">
                          {row.applications?.candidates?.full_name ||
                            row.applications?.candidates?.email ||
                            "-"}
                        </span>
                        <Badge variant="secondary">{row.overall_score}</Badge>
                      </span>
                    ) : (
                      <Link
                        href={`/dashboard/candidates/${row.application_id}`}
                        className="flex items-center justify-between rounded-xl border border-transparent px-3 py-2.5 text-sm transition-colors hover:border-border hover:bg-muted/40"
                      >
                        <span>
                          <span className="font-medium text-foreground">
                            {row.applications?.candidates?.full_name ||
                              row.applications?.candidates?.email ||
                              "-"}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {row.jobs?.title ?? "-"}
                          </span>
                        </span>
                        <Badge variant="secondary" className="shrink-0 font-semibold">
                          {row.overall_score}
                        </Badge>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card/50 p-6 shadow-sm">
          <h2 className="font-[family-name:var(--font-display-marketing)] text-lg font-medium tracking-tight">
            Your roles
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Jump into a req to manage candidates and invites.
          </p>
          <ul className="mt-6 space-y-2">
            {snap.recentJobs.length === 0 ? (
              <li className="text-sm text-muted-foreground">
                Create a role to start inviting and screening.
              </li>
            ) : (
              snap.recentJobs.map((j) => (
                <li key={j.id}>
                  {isDemo ? (
                    <span className="flex items-center justify-between rounded-xl border border-dashed border-border/60 px-3 py-2.5 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{j.title}</span>
                      <span className="text-xs">Sample</span>
                    </span>
                  ) : (
                    <Link
                      href={`/dashboard/jobs/${j.id}`}
                      className="flex items-center justify-between rounded-xl border border-transparent px-3 py-2.5 text-sm transition-colors hover:border-border hover:bg-muted/40"
                    >
                      <span className="font-medium">{j.title}</span>
                      <ArrowRight className="size-4 text-muted-foreground" />
                    </Link>
                  )}
                </li>
              ))
            )}
          </ul>
          <div className="mt-6">
            <Button variant="outline" size="sm" className="rounded-full" asChild>
              <Link href="/dashboard/candidates">Full candidate pipeline</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="rounded-2xl border border-border/80 bg-card/50 p-6 shadow-sm">
        <h2 className="font-[family-name:var(--font-display-marketing)] text-lg font-medium tracking-tight">
          Ready for review
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Latest finished sessions, open for transcript, video, and scores.
        </p>
        <div className="mt-6">
          {snap.completedSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              When candidates finish, they land here for a fast pass before your live round.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Ended</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snap.completedSessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {isDemo ? (
                        s.applications?.candidates?.full_name ||
                        s.applications?.candidates?.email ||
                        "-"
                      ) : (
                        <Link
                          href={`/dashboard/candidates/${s.application_id}`}
                          className="text-[oklch(0.28_0.08_260)] hover:underline"
                        >
                          {s.applications?.candidates?.full_name ||
                            s.applications?.candidates?.email ||
                            "-"}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.applications?.jobs?.title ?? "-"}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {s.ended_at ? new Date(s.ended_at).toLocaleString() : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
