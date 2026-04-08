import OpenAI from "openai";

export async function summarizeCandidateComparison(input: {
  jobTitle: string;
  candidates: { name: string; score: number; verdict: string; summary: string }[];
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "";
  if (input.candidates.length < 2) return "";

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You help recruiters compare finalists. Write 3-4 crisp sentences: who leads on signal, key tradeoffs, and who to advance first. No bullet points.",
      },
      {
        role: "user",
        content: JSON.stringify({
          job: input.jobTitle,
          candidates: input.candidates,
        }),
      },
    ],
    temperature: 0.5,
    max_tokens: 220,
  });
  return completion.choices[0]?.message?.content?.trim() ?? "";
}
