import Link from "next/link";
import { ArrowRight, ClipboardCheck, Mail, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PricingSection } from "@/components/marketing/pricing-section";
import { ProductIllustration } from "@/components/marketing/product-illustration";
import { Reveal } from "@/components/marketing/reveal";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

const HERO_NOISE_BG =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E\")";

const steps = [
  {
    n: "01",
    title: "Create the role",
    body: "Define the job, seniority, and focus areas.",
  },
  {
    n: "02",
    title: "Invite in one click",
    body: "Paste emails and send branded interview links instantly.",
  },
  {
    n: "03",
    title: "AI runs the screen",
    body: "VectaHire leads the interview, captures responses, and scores the session.",
  },
  {
    n: "04",
    title: "Review and decide",
    body: "See transcripts, ranked candidates, and structured verdicts in one place.",
  },
];

function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  description: string;
  align?: "center" | "left";
}) {
  return (
    <div
      className={
        align === "center"
          ? "mx-auto max-w-2xl text-center"
          : "max-w-2xl text-left"
      }
    >
      {eyebrow ? (
        <Reveal delayMs={0}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.5_0.02_260)]">
            {eyebrow}
          </p>
        </Reveal>
      ) : null}
      <Reveal delayMs={60}>
        <h2 className="mt-3 font-[family-name:var(--font-display-marketing)] text-3xl font-medium tracking-tight text-[oklch(0.22_0.04_260)] sm:text-4xl">
          {title}
        </h2>
      </Reveal>
      <Reveal delayMs={110}>
        <p className="mt-4 text-lg leading-relaxed text-[oklch(0.45_0.02_260)]">
          {description}
        </p>
      </Reveal>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,oklch(0.72_0.12_200_/_0.22),transparent)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_0%,oklch(0.65_0.14_280_/_0.12),transparent)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{ backgroundImage: HERO_NOISE_BG }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:pb-28 sm:pt-16 lg:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-14">
            <div>
              <Reveal delayMs={0}>
                <p className="inline-flex rounded-full border border-[oklch(0.88_0.03_250)] bg-white/80 px-3 py-1 text-xs font-medium text-[oklch(0.4_0.04_260)] shadow-sm backdrop-blur-sm">
                  AI first-round interviews
                </p>
              </Reveal>
              <Reveal delayMs={60}>
                <h1 className="mt-6 font-[family-name:var(--font-display-marketing)] text-4xl font-medium leading-[1.08] tracking-tight text-[oklch(0.2_0.045_260)] sm:text-5xl lg:text-[3.25rem]">
                  First-round screens that run themselves, with voice, video, and real
                  judgment.
                </h1>
              </Reveal>
              <Reveal delayMs={110}>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-[oklch(0.42_0.03_260)]">
                  No scheduling ping-pong. Candidates complete a calm, professional async
                  screen; hiring teams get transcripts, structured scores, and rankings—a
                  first-round process you can defend instead of guessing from gut feel.
                </p>
              </Reveal>
              <Reveal delayMs={160}>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Button
                    size="lg"
                    className="h-12 rounded-full bg-[oklch(0.28_0.08_260)] px-8 text-base text-white shadow-lg shadow-[oklch(0.28_0.08_260)]/20 hover:bg-[oklch(0.32_0.09_260)]"
                    asChild
                  >
                    <Link href="/signup" className="gap-2">
                      Start free
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-full border-[oklch(0.88_0.02_250)] bg-white/60 px-6 backdrop-blur-sm"
                    asChild
                  >
                    <Link href="/#pricing">View pricing</Link>
                  </Button>
                </div>
              </Reveal>
              <Reveal delayMs={210}>
                <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-[oklch(0.45_0.02_260)]">
                  <span className="flex items-center gap-2">
                    <ClipboardCheck className="size-4 shrink-0 text-[oklch(0.5_0.14_200)]" />
                    No credit card to explore
                  </span>
                  <span className="flex items-center gap-2">
                    <Zap className="size-4 shrink-0 text-[oklch(0.55_0.16_85)]" />
                    Live in minutes
                  </span>
                </div>
              </Reveal>
            </div>
            <div>
              <Reveal delayMs={120} className="motion-safe:vh-float">
                <ProductIllustration
                  src="/illustration1.png"
                  alt="VectaHire voice and video interview session"
                  caption="Voice-led, branded first-round interviews"
                  sizes="(min-width: 1024px) min(60vw, 820px), 100vw"
                  priority
                />
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[oklch(0.93_0.015_250)] bg-[oklch(0.995_0.008_250)] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            title="A hiring pipeline that runs itself"
            description="Every interview becomes structured data — scores, signals, and ready-to-review candidates across every role."
          />
          <div className="mt-14 grid gap-12 lg:grid-cols-12 lg:items-start lg:gap-14">
            <div className="min-w-0 lg:col-span-7">
              <Reveal delayMs={70}>
                <ProductIllustration
                  src="/illustration2.png"
                  alt="VectaHire home dashboard with open roles, live interviews, and strongest candidates"
                  caption="Live pipeline visibility across every open role"
                />
              </Reveal>
            </div>
            <ul className="flex flex-col gap-8 lg:col-span-5 lg:pt-4">
              {[
                {
                  title: "Live interview activity",
                  body: "See what’s in flight across the team without chasing status updates.",
                },
                {
                  title: "Strongest candidates surfaced automatically",
                  body: "Ranked signals so reviewers start with the best evidence, not the loudest inbox.",
                },
                {
                  title: "Per-role progress and completion",
                  body: "One view of every open role, pipeline depth, and who’s finished the screen.",
                },
              ].map((item, idx) => (
                <Reveal key={item.title} delayMs={120 + idx * 70}>
                  <li className="border-l-2 border-[oklch(0.88_0.02_250)] pl-5">
                    <p className="font-medium text-[oklch(0.24_0.04_260)]">{item.title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-[oklch(0.48_0.02_260)]">
                      {item.body}
                    </p>
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            title="Decisions you can defend"
            description="Not just transcripts — structured evaluations, strengths, risks, and follow-ups your team can actually use."
          />
          <div className="mt-14 grid gap-12 lg:grid-cols-12 lg:items-start lg:gap-14">
            <ul className="order-2 flex flex-col gap-8 lg:order-1 lg:col-span-5 lg:pt-4">
              {[
                {
                  title: "Structured scoring, not vibes",
                  body: "Breakdowns you can compare candidate-to-candidate and explain to hiring managers.",
                },
                {
                  title: "Clear strengths, risks, and follow-ups",
                  body: "Where they shine, where to probe next, and what to verify before an onsite.",
                },
                {
                  title: "A review surface the whole team can align on",
                  body: "Transcript, recording, and verdict in one place—no more fragmented notes.",
                },
              ].map((item, idx) => (
                <Reveal key={item.title} delayMs={120 + idx * 70}>
                  <li className="border-l-2 border-[oklch(0.88_0.02_250)] pl-5">
                    <p className="font-medium text-[oklch(0.24_0.04_260)]">{item.title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-[oklch(0.48_0.02_260)]">
                      {item.body}
                    </p>
                  </li>
                </Reveal>
              ))}
            </ul>
            <div className="order-1 min-w-0 lg:order-2 lg:col-span-7">
              <Reveal delayMs={70}>
                <ProductIllustration
                  src="/illustration3.png"
                  alt="VectaHire candidate evaluation with score breakdown, signals, gaps, and risks"
                  caption="Structured signal your team can actually defend"
                />
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-[oklch(0.93_0.015_250)] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            title="How it works"
            description="From job posting to ranked shortlist—without a new tool for candidates to learn."
          />
          <div className="mt-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {steps.map((s, idx) => (
              <Reveal key={s.n} delayMs={70 + idx * 70}>
                <div className="relative">
                  <span className="font-[family-name:var(--font-display-marketing)] text-3xl font-medium tabular-nums text-[oklch(0.88_0.04_250)]">
                    {s.n}
                  </span>
                  <h3 className="mt-4 font-semibold text-[oklch(0.22_0.04_260)]">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[oklch(0.45_0.02_260)]">
                    {s.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <PricingSection />

      <section className="border-y border-[oklch(0.92_0.015_250)] bg-[oklch(0.97_0.012_250)] py-16">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-4 sm:flex-row sm:items-center sm:px-6">
          <Reveal delayMs={0} className="max-w-2xl">
            <p className="font-[family-name:var(--font-display-marketing)] text-xl font-medium leading-snug text-[oklch(0.22_0.04_260)]">
              “We finally stopped living in Calendly for first rounds.”
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[oklch(0.48_0.02_260)]">
              Talent leaders use VectaHire when the candidate experience has to feel as serious
              as the brand.
            </p>
          </Reveal>
          <Button
            variant="outline"
            className="shrink-0 rounded-full border-[oklch(0.88_0.02_250)] bg-white"
            asChild
          >
            <Link href="/signup">
              <Reveal delayMs={120}>Book your workflow</Reveal>
            </Link>
          </Button>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <div className="mx-auto max-w-2xl">
            <Reveal delayMs={0}>
              <h2 className="font-[family-name:var(--font-display-marketing)] text-3xl font-medium tracking-tight text-[oklch(0.22_0.04_260)] sm:text-4xl">
                Ready when your next req opens
              </h2>
            </Reveal>
            <Reveal delayMs={70}>
              <p className="mt-4 text-lg text-[oklch(0.45_0.02_260)]">
                Spin up a job, send your first invite, and watch voice, video, and scores come
                back through the pipeline without a single calendar hold.
              </p>
            </Reveal>
            <Reveal delayMs={130}>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button
                  size="lg"
                  className="h-12 rounded-full bg-[oklch(0.28_0.08_260)] px-8 text-white"
                  asChild
                >
                  <Link href="/signup">Create employer account</Link>
                </Button>
                <Button size="lg" variant="outline" className="h-12 rounded-full" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
            </Reveal>
            <Reveal delayMs={190}>
              <p className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-[oklch(0.5_0.02_260)]">
                <Mail className="size-3.5 shrink-0" />
                Candidate invites powered by email—professional, branded, and trackable.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
