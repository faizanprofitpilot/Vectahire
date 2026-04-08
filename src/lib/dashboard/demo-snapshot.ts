import type { DashboardSnap } from "@/lib/dashboard/activation";

const now = new Date().toISOString();

/** Believable sample data for `?demo=1`, same shape as live dashboard snapshot. */
export function getDemoDashboardSnapshot(): DashboardSnap {
  return {
    activeJobs: 3,
    inProgress: 1,
    completed: 5,
    pendingInvites: 2,
    totalApplications: 12,
    recentJobs: [
      { id: "demo-job-1", title: "Senior Product Designer", created_at: now },
      { id: "demo-job-2", title: "Account Executive, Mid-Market", created_at: now },
      { id: "demo-job-3", title: "Customer Support Lead", created_at: now },
    ],
    recentCandidates: [
      { id: "demo-c-1", full_name: "Alex Rivera", email: "alex.r@email.com", created_at: now },
      { id: "demo-c-2", full_name: "Jordan Kim", email: "j.kim@email.com", created_at: now },
      { id: "demo-c-3", full_name: "Sam Okonkwo", email: "sam.o@email.com", created_at: now },
    ],
    completedSessions: [
      {
        id: "demo-s-1",
        application_id: "demo-a-1",
        ended_at: now,
        applications: {
          jobs: { title: "Senior Product Designer" },
          candidates: { full_name: "Alex Rivera", email: "alex.r@email.com" },
        },
      },
      {
        id: "demo-s-2",
        application_id: "demo-a-2",
        ended_at: now,
        applications: {
          jobs: { title: "Account Executive, Mid-Market" },
          candidates: { full_name: "Morgan Lee", email: "m.lee@email.com" },
        },
      },
    ],
    topRanked: [
      {
        id: "demo-r-1",
        application_id: "demo-a-1",
        rank: 1,
        overall_score: 88,
        applications: {
          candidates: { full_name: "Alex Rivera", email: "alex.r@email.com" },
        },
        jobs: { title: "Senior Product Designer" },
      },
      {
        id: "demo-r-2",
        application_id: "demo-a-2",
        rank: 2,
        overall_score: 81,
        applications: {
          candidates: { full_name: "Jordan Kim", email: "j.kim@email.com" },
        },
        jobs: { title: "Senior Product Designer" },
      },
    ],
  };
}
