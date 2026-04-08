import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { BrandLogo } from "@/components/brand-logo";
import { SignupForm } from "@/components/auth/signup-form";
import { createClient } from "@/lib/supabase/server";

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <AuthShell>
      <div className="space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <BrandLogo href="/" size="lg" priority />
          </div>
          <h1 className="mt-6 font-[family-name:var(--font-display-marketing)] text-3xl font-medium tracking-tight text-[oklch(0.2_0.045_260)]">
            Create your account
          </h1>
          <p className="mt-2 text-[oklch(0.42_0.03_260)]">
            Start replacing first-round screens with AI interviews
          </p>
        </div>
        <SignupForm />
        <p className="text-center text-sm text-[oklch(0.45_0.02_260)]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-[oklch(0.28_0.08_260)] underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
