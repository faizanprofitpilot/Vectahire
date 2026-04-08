import type { getDashboardSnapshot } from "@/lib/services/dashboard";

export type DashboardSnap = Awaited<ReturnType<typeof getDashboardSnapshot>>;

export function getActivationProgress(snap: DashboardSnap) {
  const hasJob = snap.activeJobs >= 1;
  const hasInvite = snap.totalApplications >= 1;
  const hasReviewableInterview = snap.completed >= 1;
  const steps = [
    { id: "job", label: "Create a job", done: hasJob, href: "/dashboard/jobs/new" as const },
    {
      id: "invite",
      label: "Invite a candidate",
      done: hasInvite,
      href: "/dashboard/jobs" as const,
    },
    {
      id: "review",
      label: "Review the scored interview",
      done: hasReviewableInterview,
      href: "/dashboard/candidates" as const,
    },
  ] as const;
  const completedCount = steps.filter((s) => s.done).length;
  return { steps, completedCount, totalSteps: steps.length };
}

export type ActivationProgress = ReturnType<typeof getActivationProgress>;
