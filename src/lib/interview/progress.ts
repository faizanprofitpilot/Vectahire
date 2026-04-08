import {
  INTERVIEW_MAX_TURNS,
  PLANNED_INTERVIEW_QUESTION_COUNT,
} from "@/lib/interview/constants";
import { parseInterviewQuestions } from "@/lib/jobs/interview-questions";

/**
 * Progress for the candidate UI.
 * When the job has a full plan, total matches the fixed screening count.
 */
export function computeInterviewProgress(
  interviewQuestionsJson: unknown,
  sequence: number,
): { current: number; total: number } {
  const plannedCount = parseInterviewQuestions(interviewQuestionsJson).length;
  const total =
    plannedCount >= PLANNED_INTERVIEW_QUESTION_COUNT
      ? Math.max(PLANNED_INTERVIEW_QUESTION_COUNT, sequence)
      : Math.max(INTERVIEW_MAX_TURNS, sequence);
  return { current: sequence, total };
}
