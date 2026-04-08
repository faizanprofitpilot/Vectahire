"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "not_started", label: "Not started" },
  { value: "live", label: "Interview live" },
  { value: "scoring", label: "Scoring" },
  { value: "ready", label: "Scored" },
] as const;

const VERDICT_OPTIONS = [
  { value: "all", label: "All verdicts" },
  { value: "strong_hire", label: "Strong hire" },
  { value: "hire", label: "Hire" },
  { value: "maybe", label: "Maybe" },
  { value: "no_hire", label: "No hire" },
] as const;

const SORT_OPTIONS = [
  { value: "updated", label: "Recently updated" },
  { value: "score_desc", label: "Score (high first)" },
  { value: "score_asc", label: "Score (low first)" },
] as const;

export type JobFilterOption = { id: string; title: string };

export function CandidatesPipelineFilters({ jobs }: { jobs: JobFilterOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const job = searchParams.get("job") ?? "all";
  const status = searchParams.get("status") ?? "all";
  const verdict = searchParams.get("verdict") ?? "all";
  const sort = searchParams.get("sort") ?? "updated";
  const jobLabel =
    job === "all"
      ? "All roles"
      : jobs.find((j) => j.id === job)?.title ?? "Selected role";
  const statusLabel = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? "All statuses";
  const verdictLabelText =
    VERDICT_OPTIONS.find((o) => o.value === verdict)?.label ?? "All verdicts";
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Recently updated";

  const push = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "" || v === "all") next.delete(k);
        else next.set(k, v);
      }
      startTransition(() => {
        const q = next.toString();
        router.push(q ? `/dashboard/candidates?${q}` : "/dashboard/candidates");
      });
    },
    [router, searchParams],
  );

  return (
    <div
      className={`flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end ${pending ? "opacity-70" : ""}`}
    >
      <div className="space-y-1.5 sm:min-w-[200px]">
        <Label className="text-xs text-muted-foreground">Role</Label>
        <Select
          value={job}
          onValueChange={(v: string | null) => push({ job: v && v !== "all" ? v : null })}
        >
          <SelectTrigger className="w-full sm:w-[220px]">
            {/* Base UI can display raw value (job id). Force the human label. */}
            <span className="flex flex-1 text-left">{jobLabel}</span>
            <SelectValue className="sr-only" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {jobs.map((j) => (
              <SelectItem key={j.id} value={j.id}>
                {j.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 sm:min-w-[180px]">
        <Label className="text-xs text-muted-foreground">Interview status</Label>
        <Select
          value={status}
          onValueChange={(v: string | null) => push({ status: v && v !== "all" ? v : null })}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <span className="flex flex-1 text-left">{statusLabel}</span>
            <SelectValue className="sr-only" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 sm:min-w-[160px]">
        <Label className="text-xs text-muted-foreground">Verdict</Label>
        <Select
          value={verdict}
          onValueChange={(v: string | null) => push({ verdict: v && v !== "all" ? v : null })}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <span className="flex flex-1 text-left">{verdictLabelText}</span>
            <SelectValue className="sr-only" />
          </SelectTrigger>
          <SelectContent>
            {VERDICT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 sm:min-w-[180px]">
        <Label className="text-xs text-muted-foreground">Sort</Label>
        <Select
          value={sort}
          onValueChange={(v: string | null) =>
            push({ sort: v && v !== "updated" ? v : null })
          }
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <span className="flex flex-1 text-left">{sortLabel}</span>
            <SelectValue className="sr-only" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
