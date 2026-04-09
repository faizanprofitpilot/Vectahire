import { parseInterviewQuestions, type InterviewQuestionItem } from "@/lib/jobs/interview-questions";
import { PLANNED_INTERVIEW_QUESTION_COUNT } from "@/lib/interview/constants";

export function isAudioReadyForQuestions(items: InterviewQuestionItem[]): boolean {
  if (items.length !== PLANNED_INTERVIEW_QUESTION_COUNT) return false;
  return items.every((q) => typeof q.tts_path === "string" && q.tts_path.trim().length > 0);
}

export function isAudioReadyForJobInterviewQuestions(raw: unknown): boolean {
  return isAudioReadyForQuestions(parseInterviewQuestions(raw));
}

