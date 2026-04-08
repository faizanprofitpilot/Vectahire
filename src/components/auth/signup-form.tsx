"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function SignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    const supabase = createClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const { error: signError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback?next=/onboarding`,
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    if (signError) {
      setError(signError.message);
      return;
    }
    setMessage(
      "Check your email to confirm your account, or sign in if confirmation is disabled.",
    );
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-border/80 bg-card/95 p-7 shadow-[0_20px_50px_-24px_oklch(0.25_0.05_260_/_0.18)] backdrop-blur-sm"
    >
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jordan Lee"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <Button
        type="submit"
        className="h-11 w-full rounded-full shadow-md shadow-primary/15"
        disabled={loading}
      >
        {loading ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
