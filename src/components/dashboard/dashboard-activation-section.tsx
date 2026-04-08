import Link from "next/link";
import { Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActivationProgress } from "@/lib/dashboard/activation";

export function DashboardActivationSection({
  activation,
}: {
  activation: ActivationProgress;
}) {
  const { steps, completedCount, totalSteps } = activation;

  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-[oklch(0.97_0.015_250)] shadow-[0_20px_50px_-28px_oklch(0.25_0.05_260_/_0.18)]">
      <div className="border-b border-border/60 bg-[oklch(0.99_0.008_250)]/80 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Get started
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display-marketing)] text-xl font-medium tracking-tight text-[oklch(0.2_0.045_260)] sm:text-2xl">
              Get your first candidate screened in minutes
            </h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Three steps stand between you and ranked, scored interviews you can defend in a
              hiring meeting.
            </p>
          </div>
          <div className="flex items-center gap-3 sm:shrink-0">
            <span className="font-[family-name:var(--font-display-marketing)] text-3xl font-medium tabular-nums text-[oklch(0.22_0.06_260)]">
              {completedCount}
              <span className="text-lg font-medium text-muted-foreground">/{totalSteps}</span>
            </span>
            <span className="text-xs text-muted-foreground">steps done</span>
          </div>
        </div>
      </div>
      <div className="grid gap-0 sm:grid-cols-3">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "relative border-border/50 p-5 sm:p-6",
              index > 0 && "border-t sm:border-t-0 sm:border-l",
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border-2",
                  step.done
                    ? "border-[oklch(0.55_0.14_160)] bg-[oklch(0.93_0.06_160)] text-[oklch(0.35_0.12_160)]"
                    : "border-border bg-muted/40 text-muted-foreground",
                )}
              >
                {step.done ? (
                  <Check className="size-4" strokeWidth={2.5} />
                ) : (
                  <Circle className="size-3.5" strokeWidth={2} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{step.label}</p>
                <Button
                  variant={step.done ? "ghost" : "outline"}
                  size="sm"
                  className="mt-3 h-8 rounded-full px-3 text-xs"
                  asChild
                >
                  <Link href={step.href}>{step.done ? "View" : "Go"}</Link>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
