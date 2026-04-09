import type { SubscriptionTier } from "@/types/database";

export type UsageLimits = {
  maxInvitesPerMonth: number;
  maxCompletedInterviewsPerMonth: number;
};

const TIER_LIMITS: Record<SubscriptionTier, UsageLimits> = {
  free: { maxInvitesPerMonth: 25, maxCompletedInterviewsPerMonth: 10 },
  // `starter` remains in the enum/type for compatibility, but the product offers only Free + Pro.
  starter: { maxInvitesPerMonth: 2000, maxCompletedInterviewsPerMonth: 500 },
  pro: { maxInvitesPerMonth: 2000, maxCompletedInterviewsPerMonth: 500 },
};

export function getLimitsForTier(tier: SubscriptionTier): UsageLimits {
  return TIER_LIMITS[tier] ?? TIER_LIMITS.free;
}

export function currentPeriodStart(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
