import OpenAI from "openai";
import { z } from "zod";

/** Used only for non-live interview tooling / legacy prompts; live sessions use fixed plans. */
const INTERVIEW_MIN_EXCHANGES_BEFORE_END = 3;

const turnSchema = z.object({
  action: z.enum(["question", "end"]),
  question_text: z.string().optional(),
  is_follow_up: z.boolean().optional(),
  internal_note: z.string().optional(),
});

export type TranscriptTurn = {
  sequence: number;
  question: string;
  answer: string;
  is_follow_up: boolean;
};

export type InterviewAgentInput = {
  jobTitle: string;
  jobDescription: string;
  seniority: string;
  requiredSkills: string[];
  hiringPriorities?: string | null;
  interviewFocus?: string[] | null;
  /** Employer-defined plan; guides topic order (follow-ups may interleave). */
  plannedQuestions?: { id: string; text: string }[];
  priorTurns: TranscriptTurn[];
  maxQuestions: number;
};

export async function getNextInterviewTurn(
  input: InterviewAgentInput,
): Promise<z.infer<typeof turnSchema>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const client = new OpenAI({ apiKey });
  const turnCount = input.priorTurns.length;
  const answeredCount = input.priorTurns.filter((t) => t.answer.trim().length > 0).length;
  const shouldEnd =
    turnCount >= input.maxQuestions ||
    (turnCount >= 4 && answeredCount >= input.maxQuestions - 1);

  const plan = input.plannedQuestions?.filter((q) => q.text.trim()) ?? [];
  const planNote =
    plan.length > 0
      ? `- The employer provided a question plan (planned_questions). Cover those topics in order across the interview. Use is_follow_up true when you need depth on the current topic before moving on. Paraphrase naturally; do not read them verbatim if it sounds stiff. When the plan is fully covered, transition to action "end" unless a brief wrap-up question is essential.`
      : `- No fixed question plan: derive strong probes from the role context.`;

  const system = `You are a senior hiring manager running a first-round voice interview.
Rules:
- Output ONE JSON object only with keys: action ("question" or "end"), optional question_text (spoken aloud, max 45 words), optional is_follow_up, optional internal_note.
- If action is "end", omit question_text or leave empty. Close warmly and thank them.
- Questions must sound natural, concise, and easy to say aloud. No bullet lists.
- Ask one question at a time. Reference prior answers when relevant.
- If an answer was vague, ask a sharp follow-up for specifics.
- Mix behavioral, role-relevant scenario, and light technical depth based on seniority: ${input.seniority}.
- Avoid robotic phrasing. No emojis.
${planNote}
- When you have enough signal (${input.maxQuestions} exchanges target, currently ${turnCount}), choose action "end".`;

  const description =
    input.jobDescription.length > 12_000
      ? `${input.jobDescription.slice(0, 12_000)}…`
      : input.jobDescription;

  const userPayload = {
    role: {
      title: input.jobTitle,
      description,
      seniority: input.seniority,
      required_skills: input.requiredSkills,
      hiring_priorities: input.hiringPriorities ?? "",
      interview_focus: input.interviewFocus ?? [],
    },
    planned_questions: plan.map((q) => ({ id: q.id, text: q.text })),
    conversation: input.priorTurns.map((t) => ({
      sequence: t.sequence,
      question: t.question,
      answer: t.answer,
      follow_up: t.is_follow_up,
    })),
    hint:
      answeredCount < INTERVIEW_MIN_EXCHANGES_BEFORE_END
        ? `You must ask another question (action "question"). Do not choose "end" until at least ${INTERVIEW_MIN_EXCHANGES_BEFORE_END} answers exist in the conversation; currently ${answeredCount}.`
        : shouldEnd
          ? "Prefer wrapping up unless a critical gap remains."
          : "Continue the interview with the next best question.",
  };

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(userPayload) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.45,
    max_tokens: 280,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No interview turn");
  const parsed = turnSchema.parse(JSON.parse(content));

  if (parsed.action === "question" && !parsed.question_text?.trim()) {
    return {
      action: "question",
      question_text:
        "Thanks for that. Can you walk me through a recent project where you owned a meaningful outcome end to end?",
      is_follow_up: false,
    };
  }
  return parsed;
}
