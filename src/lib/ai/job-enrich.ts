import OpenAI from "openai";
import { z } from "zod";

const enrichSchema = z.object({
  refined_description: z.string(),
  interview_focus_areas: z.array(z.string()).max(12),
});

export async function enrichJobDescription(input: {
  title: string;
  description: string;
  seniority: string;
  requiredSkills: string[];
  hiringPriorities?: string | null;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You help employers write clear job posts and define interview focus areas for a first-round screen.
Return a JSON object with keys: refined_description (string), interview_focus_areas (string array, max 12).
Focus areas must be specific interview probes, not generic bullets.
Write as a company-agnostic job post. Do NOT mention any interview platform, tooling vendor, or that an AI interview will be used.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          title: input.title,
          current_description: input.description,
          seniority: input.seniority,
          required_skills: input.requiredSkills,
          hiring_priorities: input.hiringPriorities ?? "",
        }),
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No enrichment output");
  const raw = JSON.parse(content) as unknown;
  return enrichSchema.parse(raw);
}

const draftFromTitleSchema = z.object({
  description: z.string().optional(),
  hiring_priorities: z.string().optional(),
});

export type GenerateJobFieldsMode = "description" | "hiring_priorities" | "both";

/** Generate description and/or "what success looks like" from title (+ seniority, skills) alone. */
export async function generateJobFieldsFromTitle(input: {
  title: string;
  seniority: string;
  requiredSkills: string[];
  fields: GenerateJobFieldsMode;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const title = input.title.trim();
  if (!title) throw new Error("Title is required");

  let instruction: string;
  if (input.fields === "both") {
    instruction =
      "Return a JSON object with keys: description (string), hiring_priorities (string). " +
      "description: 2–4 short paragraphs for the job post (ownership, scope, team, stack or context as relevant). " +
      "hiring_priorities: a concise paragraph or bullet-style lines describing what strong performance looks like in the first 90 days and beyond (outcomes, behaviors, bar for craft or collaboration). " +
      "Do not include salary. Write in clear, confident employer voice.";
  } else if (input.fields === "description") {
    instruction =
      "Return a JSON object with key: description (string) only. " +
      "Write 2–4 short paragraphs for the job post from the title and context (ownership, scope, team, stack as relevant). " +
      "Do not include a hiring_priorities key. Do not include salary.";
  } else {
    instruction =
      "Return a JSON object with key: hiring_priorities (string) only. " +
      "Describe what success looks like in this role: outcomes, behaviors, and how you will know they are crushing it (first 90 days and ongoing). " +
      "Do not include a description key.";
  }

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You help employers draft company-agnostic job post content. " +
          "Write for any employer; do NOT mention any interview platform, tooling vendor, or that an AI interview will be used. " +
          instruction,
      },
      {
        role: "user",
        content: JSON.stringify({
          job_title: title,
          seniority: input.seniority,
          required_skills: input.requiredSkills,
        }),
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No draft output");
  const raw = JSON.parse(content) as unknown;
  const parsed = draftFromTitleSchema.parse(raw);

  if (input.fields === "description" && !parsed.description?.trim()) {
    throw new Error("Model returned an empty description");
  }
  if (input.fields === "hiring_priorities" && !parsed.hiring_priorities?.trim()) {
    throw new Error("Model returned an empty success criteria");
  }
  if (input.fields === "both" && (!parsed.description?.trim() || !parsed.hiring_priorities?.trim())) {
    throw new Error("Model returned incomplete draft");
  }

  return {
    description: parsed.description?.trim() ?? "",
    hiring_priorities: parsed.hiring_priorities?.trim() ?? "",
  };
}
