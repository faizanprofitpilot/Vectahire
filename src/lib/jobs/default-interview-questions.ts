import { randomUUID } from "crypto";
import type { InterviewQuestionItem } from "@/lib/jobs/interview-questions";
import { PLANNED_INTERVIEW_QUESTION_COUNT } from "@/lib/interview/constants";

function cap(s: string, n: number) {
  const t = (s || "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

export function defaultInterviewQuestions(input: {
  title: string;
  seniority: string;
  requiredSkills: unknown;
}): InterviewQuestionItem[] {
  const title = cap(input.title, 90) || "this role";
  const seniority = cap(input.seniority, 40) || "mid";
  const skills =
    Array.isArray(input.requiredSkills) ? input.requiredSkills.map(String).filter(Boolean) : [];
  const skillHint = skills.slice(0, 4).join(", ");
  const skillLine = skillHint ? ` (focus: ${skillHint})` : "";

  const q: string[] = [
    `What attracted you to ${title}, and what are you looking for next?`,
    `Walk me through a recent project you’re proud of that’s relevant to ${title}.`,
    `How do you define success in your first 60–90 days in a ${seniority}-level role like this?`,
    `Tell me about a time you had to make a trade-off under real constraints. What did you choose and why?`,
    `Describe how you approach problem-solving when requirements are unclear or shifting.`,
    `How do you collaborate with cross-functional partners and handle disagreement?`,
    `What does “high quality” mean to you in this role${skillLine}?`,
    `Tell me about a time you improved a process or system that scaled your impact.`,
    `What’s a weakness or gap you’re actively working on, and how are you improving it?`,
    `If you joined tomorrow, what would you do in your first week to get effective quickly?`,
  ];

  // Ensure exactly 10
  const trimmed = q.map((x) => x.trim()).filter(Boolean).slice(0, PLANNED_INTERVIEW_QUESTION_COUNT);
  while (trimmed.length < PLANNED_INTERVIEW_QUESTION_COUNT) {
    trimmed.push("Tell me about a time you learned something quickly and applied it.");
  }

  return trimmed.map((text) => ({ id: randomUUID(), text }));
}

