import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { BrandLogo } from "@/components/brand-logo";
import { LoginForm } from "@/components/auth/login-form";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const params = await searchParams;
  if (user) {
    redirect(params.redirect ?? "/dashboard");
  }

  return (
    <AuthShell>
      <div className="space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <BrandLogo href="/" size="lg" priority />
          </div>
          <h1 className="mt-6 font-[family-name:var(--font-display-marketing)] text-3xl font-medium tracking-tight text-[oklch(0.2_0.045_260)]">
            Sign in
          </h1>
          <p className="mt-2 text-[oklch(0.42_0.03_260)]">
            Employer access to your hiring workspace
          </p>
        </div>
        {params.error ? (
          <p className="text-center text-sm text-destructive">
            Something went wrong. Try again.
          </p>
        ) : null}
        <LoginForm redirectTo={params.redirect} />
        <p className="text-center text-sm text-[oklch(0.45_0.02_260)]">
          No account?{" "}
          <Link
            href="/signup"
            className="font-medium text-[oklch(0.28_0.08_260)] underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
