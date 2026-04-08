import OpenAI from "openai";
import { z } from "zod";

const responseSchema = z.object({
  questions: z.array(z.string()).length(10),
});

export async function generateInterviewQuestionsForRole(input: {
  title: string;
  description: string;
  seniority: string;
  requiredSkills: string[];
  hiringPriorities?: string | null;
}): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You write the core question plan for a voice-first screening interview.
Return JSON with key "questions": an array of exactly 10 strings (no more, no fewer).
Order matters: questions 1–3 are broader context and motivation; 4–7 probe role-specific skills and scenarios; 8–10 are more specific and concrete (including a light close).
Each question must:
- Sound natural spoken aloud (no bullets, no numbering in the text).
- Be one focused prompt, at most 45 words.
- Mix behavioral, role-relevant scenario, and depth appropriate to seniority.
- Avoid duplicates; cover different angles (ownership, judgment, collaboration, craft or domain as relevant).
- No emojis.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          title: input.title,
          description: input.description,
          seniority: input.seniority,
          required_skills: input.requiredSkills,
          hiring_priorities: input.hiringPriorities ?? "",
        }),
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.65,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No interview questions output");
  const raw = JSON.parse(content) as unknown;
  const parsed = responseSchema.parse(raw);
  const out = parsed.questions.map((q) => q.trim());
  if (out.length !== 10 || out.some((q) => !q)) {
    throw new Error("Interview plan must contain exactly 10 non-empty questions");
  }
  return out;
}
