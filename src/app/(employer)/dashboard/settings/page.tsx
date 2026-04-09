import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { UpgradeToProButton } from "@/components/billing/upgrade-to-pro-button";
import { createClient } from "@/lib/supabase/server";
import { ensureEmployer } from "@/lib/services/employer";
import { getOrCreateUsageRow } from "@/lib/services/usage";
import { getLimitsForTier } from "@/lib/billing/limits";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const employer = await ensureEmployer(user);
  const usage = await getOrCreateUsageRow(employer.id);
  const limits = getLimitsForTier(employer.subscription_tier);

  const { data: sub } = await supabase
    .from("employer_subscriptions")
    .select("tier, status, current_period_end")
    .eq("employer_id", employer.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <DashboardPageHeader
        title="Settings"
        description="Workspace profile and plan usage (Stripe-ready)."
      />

      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>Visible on candidate emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Company</span>{" "}
            <span className="font-medium">{employer.company_name || "-"}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Your name</span>{" "}
            <span className="font-medium">{employer.full_name}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Email</span>{" "}
            <span className="font-medium">{employer.email}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan & usage</CardTitle>
          <CardDescription>
            Limits are enforced before invites; interviews counted when scoring completes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Tier</span>
            <Badge className="rounded-md">{employer.subscription_tier}</Badge>
            {sub?.status ? <Badge variant="outline">{sub.status}</Badge> : null}
          </div>
          {employer.subscription_tier !== "pro" ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-muted/20 p-5">
              <div>
                <p className="font-medium">Upgrade to Pro</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Higher limits for invites and scored interviews.
                </p>
              </div>
              <UpgradeToProButton />
            </div>
          ) : null}
          {sub?.current_period_end ? (
            <p className="text-muted-foreground">
              Current period ends {new Date(sub.current_period_end).toLocaleDateString()}
            </p>
          ) : null}
          <div className="grid gap-3 rounded-2xl border border-border/80 bg-muted/30 p-5">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Invites this month</span>
              <span className="font-medium tabular-nums">
                {usage.invites_count} / {limits.maxInvitesPerMonth}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Completed interviews scored</span>
              <span className="font-medium tabular-nums">
                {usage.interviews_count} / {limits.maxCompletedInterviewsPerMonth}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
