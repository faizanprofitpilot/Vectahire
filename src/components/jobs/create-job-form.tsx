"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createJob, generateJobDraftFromTitleAction } from "@/app/(employer)/dashboard/jobs/actions";
import type { JobTemplateDefaults } from "@/lib/jobs/starter-templates";
const seniorities = [
  { value: "intern", label: "Intern" },
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid-level" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
  { value: "executive", label: "Executive" },
];

export function CreateJobForm({
  templateDefaults,
}: {
  templateDefaults?: JobTemplateDefaults | null;
}) {
  const router = useRouter();
  const [skills, setSkills] = useState(templateDefaults?.skills ?? "");
  const [seniority, setSeniority] = useState(templateDefaults?.seniority ?? "mid");
  const [description, setDescription] = useState(templateDefaults?.description ?? "");
  const [title, setTitle] = useState(templateDefaults?.title ?? "");
  const [successInRole, setSuccessInRole] = useState(templateDefaults?.successPrompt ?? "");
  const [location, setLocation] = useState(templateDefaults?.location ?? "");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [drafting, setDrafting] = useState<null | "description" | "hiring_priorities">(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function skillListFromInput() {
    return skills
      .split(/[,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function onDraftFromTitle(fields: "description" | "hiring_priorities") {
    setDraftError(null);
    if (!title.trim()) {
      setDraftError("Add a job title first.");
      return;
    }
    setDrafting(fields);
    const res = await generateJobDraftFromTitleAction({
      title: title.trim(),
      seniority,
      required_skills: skillListFromInput(),
      fields,
    });
    setDrafting(null);
    if ("error" in res && res.error) {
      setDraftError(res.error);
      return;
    }
    if ("description" in res && res.description && fields === "description") {
      setDescription(res.description);
    }
    if ("hiring_priorities" in res && res.hiring_priorities && fields === "hiring_priorities") {
      setSuccessInRole(res.hiring_priorities);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("required_skills", JSON.stringify(skillListFromInput()));
    fd.set("seniority", seniority);
    setSubmitting(true);
    try {
      const res = await createJob(fd);
      if (res && typeof res === "object" && "error" in res && res.error) {
        setFormError(res.error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display-marketing)] text-3xl font-medium tracking-tight text-[oklch(0.2_0.045_260)]">
          New job
        </h1>
        <p className="mt-2 max-w-xl text-[oklch(0.42_0.03_260)]">
          What you capture here shapes interview questions, follow-ups, and how candidates are
          scored, so reviewers get comparable signal across applicants.
        </p>
      </div>
      {draftError ? <p className="text-sm text-destructive">{draftError}</p> : null}

      <div className="space-y-4 rounded-2xl border border-border/80 bg-card/95 p-6 shadow-[0_16px_48px_-20px_oklch(0.25_0.05_260_/_0.14)] backdrop-blur-sm sm:p-8">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Senior Product Designer"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <p className="text-xs text-muted-foreground">
              This helps shape the interview questions and evaluation criteria.
            </p>
            <div className="relative">
              <Textarea
                id="description"
                name="description"
                required
                rows={8}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will they own? Team context, stack, outcomes."
                className="min-h-[11rem] pb-12"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute bottom-2 right-2 z-10 gap-1.5 shadow-sm"
                disabled={!!drafting || !title.trim()}
                onClick={() => void onDraftFromTitle("description")}
              >
                {drafting === "description" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                Generate from title
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="skills">Required skills (comma-separated)</Label>
            <Input
              id="skills"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="Figma, systems thinking, B2B SaaS"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label>Seniority</Label>
              <Select
                value={seniority}
                onValueChange={(v) => setSeniority(v ?? "mid")}
              >
                <SelectTrigger
                  className="h-auto min-h-8 w-full py-2 text-left [&_[data-slot=select-value]]:line-clamp-none [&_[data-slot=select-value]]:whitespace-normal"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  align="start"
                  alignItemWithTrigger={false}
                  className="min-w-[280px] max-w-[min(100vw-2rem,32rem)] w-max sm:min-w-[320px]"
                >
                  {seniorities.map((s) => (
                    <SelectItem
                      key={s.value}
                      value={s.value}
                      className="whitespace-normal py-2 pr-8"
                    >
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Remote, Americas"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="salary_min">Salary min (optional)</Label>
              <Input
                id="salary_min"
                name="salary_min"
                type="number"
                min={0}
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary_max">Salary max (optional)</Label>
              <Input
                id="salary_max"
                name="salary_max"
                type="number"
                min={0}
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
              />
            </div>
          </div>
          <input type="hidden" name="salary_currency" value="USD" readOnly />
          <div className="space-y-2">
            <Label htmlFor="hiring_priorities">What does success look like in this role?</Label>
            <p className="text-xs text-muted-foreground">
              This helps shape the interview questions and evaluation criteria.
            </p>
            <div className="relative">
              <Textarea
                id="hiring_priorities"
                name="hiring_priorities"
                rows={3}
                value={successInRole}
                onChange={(e) => setSuccessInRole(e.target.value)}
                placeholder="e.g. ships reliable experiments weekly, earns trust with sales, raises the craft bar for the team…"
                className="min-h-[88px] pb-12"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute bottom-2 right-2 z-10 gap-1.5 shadow-sm"
                disabled={!!drafting || !title.trim()}
                onClick={() => void onDraftFromTitle("hiring_priorities")}
              >
                {drafting === "hiring_priorities" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                Generate from title
              </Button>
            </div>
          </div>
          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              type="submit"
              disabled={submitting}
              className="gap-2 rounded-full px-6 shadow-md shadow-primary/10"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create job & start screening"
              )}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </div>
    </form>
  );
}
