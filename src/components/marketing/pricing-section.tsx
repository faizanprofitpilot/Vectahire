import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLimitsForTier } from "@/lib/billing/limits";

const tiers = [
  {
    id: "free" as const,
    name: "Free",
    blurb: "Prove the workflow with your next role.",
    price: "$0",
    period: "forever",
    highlighted: false,
    cta: "Start free",
    href: "/signup",
    footnote: null as string | null,
  },
  {
    id: "starter" as const,
    name: "Starter",
    blurb: "Growing teams running consistent screens.",
    price: "$149",
    period: "per month",
    highlighted: true,
    cta: "Get started",
    href: "/signup",
    footnote: "Illustrative price, connect Stripe when you are ready to bill.",
  },
  {
    id: "pro" as const,
    name: "Pro",
    blurb: "High volume hiring with priority expectations.",
    price: "Custom",
    period: "talk to us",
    highlighted: false,
    cta: "Contact sales",
    href: "/signup",
    footnote: "Volume, SSO, and security reviews available on Pro.",
  },
];

const includedEverywhere = [
  "Voice + video async interviews",
  "AI adaptive follow-ups",
  "Transcripts, scores & per-job rankings",
  "Employer dashboard & email invites",
];

export function PricingSection() {
  return (
    <section
      id="pricing"
      className="border-y border-[oklch(0.92_0.015_250)] bg-white py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-[family-name:var(--font-display-marketing)] text-3xl font-medium tracking-tight text-[oklch(0.22_0.04_260)] sm:text-4xl">
            Simple plans. Serious limits.
          </h2>
          <p className="mt-4 text-lg text-[oklch(0.45_0.02_260)]">
            Start free, upgrade when interviews become your default first round. Usage maps
            cleanly to Stripe later with no schema rewrites.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3 lg:items-stretch">
          {tiers.map((tier) => {
            const limits = getLimitsForTier(tier.id);
            return (
              <div
                key={tier.id}
                className={`relative flex flex-col rounded-2xl border p-8 ${
                  tier.highlighted
                    ? "border-[oklch(0.45_0.12_260)] bg-[oklch(0.22_0.06_260)] text-white shadow-[0_24px_60px_-15px_oklch(0.25_0.06_260_/_0.35)] lg:scale-[1.02]"
                    : "border-[oklch(0.9_0.02_250)] bg-[oklch(0.995_0.005_250)]"
                }`}
              >
                {tier.highlighted ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[oklch(0.55_0.18_195)] px-3 py-0.5 text-xs font-semibold text-white">
                    Most popular
                  </span>
                ) : null}
                <p
                  className={`text-sm font-semibold uppercase tracking-wider ${
                    tier.highlighted ? "text-white/70" : "text-[oklch(0.45_0.02_260)]"
                  }`}
                >
                  {tier.name}
                </p>
                <p
                  className={`mt-2 text-sm ${
                    tier.highlighted ? "text-white/80" : "text-[oklch(0.45_0.02_260)]"
                  }`}
                >
                  {tier.blurb}
                </p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span
                    className={`font-[family-name:var(--font-display-marketing)] text-4xl font-medium ${
                      tier.highlighted ? "text-white" : "text-[oklch(0.2_0.04_260)]"
                    }`}
                  >
                    {tier.price}
                  </span>
                  {tier.period !== "forever" && tier.period !== "talk to us" ? (
                    <span
                      className={
                        tier.highlighted ? "text-white/70" : "text-[oklch(0.45_0.02_260)]"
                      }
                    >
                      /{tier.period}
                    </span>
                  ) : (
                    <span
                      className={`text-sm ${
                        tier.highlighted ? "text-white/70" : "text-[oklch(0.45_0.02_260)]"
                      }`}
                    >
                      {tier.period}
                    </span>
                  )}
                </div>
                <ul className="mt-8 flex-1 space-y-3 text-sm">
                  <li
                    className={`flex gap-2 ${
                      tier.highlighted ? "text-white/90" : "text-[oklch(0.38_0.03_260)]"
                    }`}
                  >
                    <Check
                      className={`mt-0.5 size-4 shrink-0 ${
                        tier.highlighted
                          ? "text-[oklch(0.65_0.18_195)]"
                          : "text-[oklch(0.5_0.14_200)]"
                      }`}
                    />
                    <span>
                      <strong className="font-semibold">{limits.maxInvitesPerMonth}</strong>{" "}
                      candidate invites / month
                    </span>
                  </li>
                  <li
                    className={`flex gap-2 ${
                      tier.highlighted ? "text-white/90" : "text-[oklch(0.38_0.03_260)]"
                    }`}
                  >
                    <Check
                      className={`mt-0.5 size-4 shrink-0 ${
                        tier.highlighted
                          ? "text-[oklch(0.65_0.18_195)]"
                          : "text-[oklch(0.5_0.14_200)]"
                      }`}
                    />
                    <span>
                      <strong className="font-semibold">
                        {limits.maxCompletedInterviewsPerMonth}
                      </strong>{" "}
                      scored interviews / month
                    </span>
                  </li>
                  {includedEverywhere.map((f) => (
                    <li
                      key={f}
                      className={`flex gap-2 ${
                        tier.highlighted ? "text-white/85" : "text-[oklch(0.42_0.02_260)]"
                      }`}
                    >
                      <Check
                        className={`mt-0.5 size-4 shrink-0 opacity-80 ${
                          tier.highlighted ? "text-white/60" : "text-[oklch(0.55_0.02_260)]"
                        }`}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                {tier.footnote ? (
                  <p
                    className={`mt-4 text-xs ${
                      tier.highlighted ? "text-white/55" : "text-[oklch(0.5_0.02_260)]"
                    }`}
                  >
                    {tier.footnote}
                  </p>
                ) : null}
                <Button
                  className={`mt-8 w-full rounded-full ${
                    tier.highlighted
                      ? "bg-white text-[oklch(0.22_0.06_260)] hover:bg-white/90"
                      : "bg-[oklch(0.28_0.08_260)] text-white hover:bg-[oklch(0.32_0.09_260)]"
                  }`}
                  variant={tier.highlighted ? "secondary" : "default"}
                  asChild
                >
                  <Link href={tier.href}>{tier.cta}</Link>
                </Button>
              </div>
            );
          })}
        </div>

        <p className="mx-auto mt-12 max-w-2xl text-center text-sm text-[oklch(0.48_0.02_260)]">
          The product is the same on every tier; limits scale with your monthly invites and
          completed interviews. Stripe billing can plug in without changing how usage is
          tracked.
        </p>
      </div>
    </section>
  );
}
