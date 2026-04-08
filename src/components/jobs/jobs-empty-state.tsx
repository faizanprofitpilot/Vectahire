import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { STARTER_JOB_TEMPLATES } from "@/lib/jobs/starter-templates";

export function JobsEmptyState() {
  const templates = Object.entries(STARTER_JOB_TEMPLATES) as [
    string,
    (typeof STARTER_JOB_TEMPLATES)["sdr"],
  ][];

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-card to-[oklch(0.98_0.01_250)] p-6 shadow-sm sm:p-8">
        <h2 className="font-[family-name:var(--font-display-marketing)] text-xl font-medium tracking-tight text-[oklch(0.2_0.045_260)] sm:text-2xl">
          Create your first role to start screening candidates automatically
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Each job becomes an AI interview tailored to the role. You invite candidates with one
          link; they complete voice and video on their time. You get transcript, score, ranking,
          and a clear recommendation, so you spend live interviews on people worth it.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="rounded-full shadow-md shadow-primary/15">
            <Link href="/dashboard/jobs/new" className="gap-2">
              <Plus className="size-4" />
              New job
            </Link>
          </Button>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-foreground">Start from a template</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Pre-filled context you can edit, gets you to invites faster.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {templates.map(([id, t]) => (
            <Card key={id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t.label}</CardTitle>
                <CardDescription className="line-clamp-2">{t.blurb}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="w-full rounded-full" asChild>
                  <Link href={`/dashboard/jobs/new?template=${id}`}>Use template</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
