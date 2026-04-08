import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";
import { ensureEmployer } from "@/lib/services/employer";
import { completeOnboarding } from "./actions";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const employer = await ensureEmployer(user);
  if (employer.onboarding_completed) redirect("/dashboard");

  return (
    <AuthShell maxWidthClass="max-w-lg">
      <div className="space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <BrandLogo href="/" size="lg" priority />
          </div>
          <h1 className="mt-6 font-[family-name:var(--font-display-marketing)] text-3xl font-medium tracking-tight text-[oklch(0.2_0.045_260)]">
            Set up your workspace
          </h1>
          <p className="mt-2 text-[oklch(0.42_0.03_260)]">
            A few details so candidates see the right company name on invites.
          </p>
        </div>
        {params.error === "required" ? (
          <p className="text-sm text-destructive">Company and name are required.</p>
        ) : null}
        {params.error === "save" ? (
          <p className="text-sm text-destructive">Could not save. Try again.</p>
        ) : null}
        <form
          action={completeOnboarding}
          className="space-y-6 rounded-2xl border border-border/80 bg-card/95 p-8 shadow-[0_20px_50px_-24px_oklch(0.25_0.05_260_/_0.2)] backdrop-blur-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="company_name">Company name</Label>
            <Input
              id="company_name"
              name="company_name"
              required
              defaultValue={employer.company_name}
              placeholder="Acme Robotics"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_name">Your name</Label>
            <Input
              id="full_name"
              name="full_name"
              required
              defaultValue={employer.full_name}
              placeholder="Jordan Lee"
            />
          </div>
          <Button type="submit" className="h-11 w-full rounded-full shadow-md shadow-primary/15">
            Continue to dashboard
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
