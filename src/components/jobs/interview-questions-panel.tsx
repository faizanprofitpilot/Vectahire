"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Loader2,
  MessageSquareQuote,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PLANNED_INTERVIEW_QUESTION_COUNT } from "@/lib/interview/constants";
import type { InterviewQuestionItem } from "@/lib/jobs/interview-questions";
import {
  generateInterviewQuestionsAction,
  saveInterviewQuestionsAction,
} from "@/app/(employer)/dashboard/jobs/questions-actions";

function newId() {
  return globalThis.crypto.randomUUID();
}

export function InterviewQuestionsPanel({
  jobId,
  initialQuestions,
}: {
  jobId: string;
  initialQuestions: InterviewQuestionItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<InterviewQuestionItem[]>(initialQuestions);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const initialKey = JSON.stringify(initialQuestions);
  const prevInitialKey = useRef<string | null>(null);
  useEffect(() => {
    if (prevInitialKey.current === null) {
      prevInitialKey.current = initialKey;
      return;
    }
    if (prevInitialKey.current === initialKey) return;
    prevInitialKey.current = initialKey;
    setItems(JSON.parse(initialKey) as InterviewQuestionItem[]);
    setDirty(false);
  }, [initialKey]);

  function updateAt(index: number, text: string) {
    setItems((prev) => {
      const next = [...prev];
      const row = next[index];
      if (!row) return prev;
      next[index] = { ...row, text };
      return next;
    });
    setDirty(true);
  }

  function removeAt(index: number) {
    if (items.length === PLANNED_INTERVIEW_QUESTION_COUNT) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  function move(index: number, dir: -1 | 1) {
    setItems((prev) => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[index]!;
      next[index] = next[j]!;
      next[j] = tmp;
      return next;
    });
    setDirty(true);
  }

  function addQuestion() {
    if (items.length >= PLANNED_INTERVIEW_QUESTION_COUNT) return;
    setItems((prev) => [...prev, { id: newId(), text: "" }]);
    setDirty(true);
  }

  async function onSave() {
    setSaving(true);
    const res = await saveInterviewQuestionsAction(jobId, items);
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Interview questions saved");
    setDirty(false);
    router.refresh();
  }

  async function onGenerate() {
    setGenerating(true);
    const res = await generateInterviewQuestionsAction(jobId);
    setGenerating(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    if (res.questions?.length) {
      setItems(res.questions);
      setDirty(false);
      toast.success("Generated new questions from this role");
      router.refresh();
    }
  }

  return (
    <details className="group overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-[oklch(0.99_0.012_260)] shadow-[0_20px_60px_-28px_oklch(0.22_0.06_260_/_0.2)] open:shadow-[0_24px_64px_-24px_oklch(0.22_0.06_260_/_0.22)]">
      <summary className="cursor-pointer list-none px-5 py-4 marker:content-none outline-none sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="flex w-full items-center justify-between gap-3">
          <span className="flex min-w-0 flex-1 items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[oklch(0.93_0.05_280)] text-[oklch(0.38_0.14_280)] shadow-inner shadow-white/40">
              <MessageSquareQuote className="size-5" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 text-left">
              <span className="font-[family-name:var(--font-display-marketing)] text-lg font-medium tracking-tight text-[oklch(0.18_0.05_260)]">
                Interview questions
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                {items.length === 0
                  ? "None yet. Generate a 10-question plan for screening interviews."
                  : `${items.length}/${PLANNED_INTERVIEW_QUESTION_COUNT} questions · fixed order for each candidate`}
              </span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="text-xs font-normal text-muted-foreground group-open:hidden">Show</span>
            <span className="hidden text-xs font-normal text-muted-foreground group-open:inline">
              Hide
            </span>
            <ChevronDown
              className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
              aria-hidden
            />
          </span>
        </span>
      </summary>

      <div className="space-y-4 border-t border-border/60 px-4 py-5 sm:px-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          First-round screens use exactly {PLANNED_INTERVIEW_QUESTION_COUNT} role-specific questions,
          broad to specific. Candidates hear them in this order; edit wording or regenerate from the
          role. Question audio is prepared when you save.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full border-[oklch(0.88_0.04_280)] bg-card/80 gap-1.5 shadow-sm"
            disabled={generating}
            onClick={() => void onGenerate()}
          >
            {generating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            {items.length ? "Regenerate with AI" : "Generate with AI"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full gap-1.5"
            disabled={items.length >= PLANNED_INTERVIEW_QUESTION_COUNT}
            onClick={addQuestion}
          >
            <Plus className="size-3.5" />
            Add question
          </Button>
        </div>

        <div className="space-y-3">
          {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/15 px-5 py-10 text-center">
            <p className="text-sm font-medium text-foreground">No questions yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Generate {PLANNED_INTERVIEW_QUESTION_COUNT} tailored questions from this job, or add
              your own until you reach {PLANNED_INTERVIEW_QUESTION_COUNT}. Saving stores the plan and
              prepares audio.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                className="rounded-full gap-1.5"
                disabled={generating}
                onClick={() => void onGenerate()}
              >
                {generating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Generate with AI
              </Button>
              <Button type="button" variant="outline" className="rounded-full" onClick={addQuestion}>
                Add manually
              </Button>
            </div>
          </div>
          ) : (
            <ul className="space-y-3">
            {items.map((q, index) => (
              <li
                key={q.id}
                className="group rounded-xl border border-border/60 bg-card/70 p-3 shadow-sm transition-[box-shadow,border-color] hover:border-[oklch(0.82_0.04_260)] hover:shadow-md sm:p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="flex items-center gap-2 sm:flex-col sm:items-center sm:pt-1">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[oklch(0.94_0.04_260)] font-mono text-xs font-semibold tabular-nums text-[oklch(0.35_0.1_260)]">
                      {index + 1}
                    </span>
                    <div className="flex gap-0.5 sm:flex-col">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 text-muted-foreground"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                        aria-label="Move up"
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 text-muted-foreground"
                        disabled={index >= items.length - 1}
                        onClick={() => move(index, 1)}
                        aria-label="Move down"
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={q.text}
                    onChange={(e) => updateAt(index, e.target.value)}
                    placeholder="What you want to learn in this turn…"
                    rows={3}
                    className="min-h-[5.5rem] flex-1 resize-y rounded-xl border-border/80 bg-background/80 text-[15px] leading-relaxed shadow-inner"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={items.length === PLANNED_INTERVIEW_QUESTION_COUNT}
                    onClick={() => removeAt(index)}
                    aria-label="Remove question"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
            </ul>
          )}

          {items.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4">
              <p className="text-xs text-muted-foreground">
                {dirty ? "You have unsaved changes." : "All changes saved to this role."}
              </p>
              <Button
                type="button"
                className="rounded-full px-6"
                disabled={!dirty || saving}
                onClick={() => void onSave()}
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Save changes
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </details>
  );
}
