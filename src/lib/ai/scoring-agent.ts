import OpenAI from "openai";
import { z } from "zod";
import type { FinalVerdict } from "@/types/database";

/** Models often return a single string or comma-separated text instead of JSON string arrays. */
function coerceBulletArray(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val
      .map((v) => String(v).trim())
      .filter(Boolean)
      .slice(0, 8);
  }
  if (typeof val === "string") {
    return val
      .split(/\n+|;/)
      .flatMap((line) => line.split(/,(?=\s|[A-Za-z])/))
      .map((s) => s.replace(/^[-*•\d.)]+\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 8);
  }
  return [];
}

const bulletList = z.preprocess(
  coerceBulletArray,
  z.array(z.string().max(800)).max(8),
);

const scoreSchema = z.object({
  overall_score: z.number().min(0).max(100),
  communication_score: z.number().min(0).max(100),
  role_fit_score: z.number().min(0).max(100),
  problem_solving_score: z.number().min(0).max(100),
  experience_score: z.number().min(0).max(100),
  confidence_score: z.number().min(0).max(100),
  strengths: bulletList,
  weaknesses: bulletList,
  risks: bulletList,
  summary: z.string().min(20).max(2000),
  final_verdict: z.enum(["strong_hire", "hire", "maybe", "no_hire"]),
});

export type ScoringResult = z.infer<typeof scoreSchema>;

export async function scoreInterview(input: {
  jobTitle: string;
  jobDescription: string;
  seniority: string;
  requiredSkills: string[];
  hiringPriorities?: string | null;
  candidateName?: string | null;
  transcript: { question: string; answer: string; is_follow_up: boolean }[];
}): Promise<ScoringResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const client = new OpenAI({ apiKey });
  const system = `You are an internal hiring evaluator. Assess the candidate strictly from the transcript.
Return JSON only with:
communication_score, role_fit_score, problem_solving_score, experience_score, confidence_score (0-100 integers each — independent dimensions on the same scale, NOT components that sum to a total),
overall_score (0-100 integer — MUST equal the arithmetic mean of those five scores, rounded to the nearest integer),
strengths, weaknesses, risks — each MUST be a JSON array of strings (max 8 items each), e.g. ["Clear communication", "Relevant experience"]. Never use a single string for these fields.
summary (2-4 sentences, decisive),
final_verdict: one of strong_hire | hire | maybe | no_hire.
Be direct. Avoid generic filler. Map scores to evidence from answers.`;

  const userPayload = {
    candidate: input.candidateName ?? "Candidate",
    job: {
      title: input.jobTitle,
      description: input.jobDescription,
      seniority: input.seniority,
      required_skills: input.requiredSkills,
      hiring_priorities: input.hiringPriorities ?? "",
    },
    transcript: input.transcript,
  };

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(userPayload) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No scoring output");
  const raw = JSON.parse(content) as unknown;
  const parsed = scoreSchema.parse(raw);
  const subscores = [
    parsed.communication_score,
    parsed.role_fit_score,
    parsed.problem_solving_score,
    parsed.experience_score,
    parsed.confidence_score,
  ];
  const meanOverall = Math.round(
    subscores.reduce((a, b) => a + b, 0) / subscores.length,
  );
  const overall_score = Math.min(100, Math.max(0, meanOverall));

  return {
    ...parsed,
    overall_score,
    final_verdict: parsed.final_verdict as FinalVerdict,
  };
}
