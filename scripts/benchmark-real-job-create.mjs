#!/usr/bin/env node
/**
 * "Real" job creation benchmark:
 * - Inserts a jobs row (like createJob does)
 * - Runs one OpenAI call to generate 10 questions
 * - Runs Deepgram TTS + Supabase Storage upload for each question (10 items)
 * - Updates jobs.interview_questions with tts_path
 *
 * Run:
 *   node --env-file=.env.local scripts/benchmark-real-job-create.mjs
 *
 * Env required:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - OPENAI_API_KEY
 * - DEEPGRAM_API_KEY
 *
 * Optional:
 * - VH_EMPLOYER_ID: use a specific employer id; otherwise uses first employers row
 * - VH_TTS_CONCURRENCY: default 1 (sequential). Try 3-5 to see improvement.
 */

import { performance } from "node:perf_hooks";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "interview-videos";

function now() {
  return performance.now();
}
function durMs(t0) {
  return Math.round(performance.now() - t0);
}
async function time(label, fn) {
  const t0 = now();
  const out = await fn();
  console.log(`  ${label}: ${durMs(t0)}ms`);
  return out;
}

async function deepgramTtsMp3(text) {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) throw new Error("DEEPGRAM_API_KEY is not set");
  const res = await fetch("https://api.deepgram.com/v1/speak?model=aura-2-thalia-en", {
    method: "POST",
    headers: {
      Authorization: `Token ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Deepgram TTS failed: ${res.status} ${err}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function jobQuestionTtsPath(jobId, index) {
  return `tts/${jobId}/${index}.mp3`;
}

function pLimit(concurrency) {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= concurrency) return;
    const item = queue.shift();
    if (!item) return;
    active++;
    Promise.resolve()
      .then(item.fn)
      .then(item.resolve, item.reject)
      .finally(() => {
        active--;
        next();
      });
  };
  return (fn) =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const ttsConcurrency = Math.max(1, Number(process.env.VH_TTS_CONCURRENCY || "1") || 1);

  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!service) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  if (!openaiKey) throw new Error("Missing OPENAI_API_KEY");
  if (!process.env.DEEPGRAM_API_KEY) throw new Error("Missing DEEPGRAM_API_KEY");

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("\n=== Real job create benchmark ===\n");
  console.log(`  TTS concurrency: ${ttsConcurrency}\n`);

  const employerId =
    process.env.VH_EMPLOYER_ID ||
    (await time("DB: pick employer", async () => {
      const { data, error } = await admin.from("employers").select("id").limit(1).maybeSingle();
      if (error) throw error;
      if (!data?.id) throw new Error("No employers row found; set VH_EMPLOYER_ID");
      return data.id;
    }));

  const jobId = await time("DB: insert job row", async () => {
    const payload = {
      employer_id: employerId,
      title: "[benchmark] real job create latency",
      description:
        "Benchmark role. This is dummy data used to measure OpenAI + TTS + Storage latency.",
      required_skills: ["communication", "ownership", "problem solving"],
      seniority: "mid",
      location: "Remote",
      hiring_priorities: "Clarity, speed, and strong judgment under ambiguity.",
      interview_questions: [],
    };
    const { data, error } = await admin.from("jobs").insert(payload).select("id").single();
    if (error) throw error;
    return data.id;
  });

  const job = await time("DB: load job fields", async () => {
    const { data, error } = await admin
      .from("jobs")
      .select("id, title, description, seniority, required_skills, hiring_priorities")
      .eq("id", jobId)
      .single();
    if (error) throw error;
    return data;
  });

  const openai = new OpenAI({ apiKey: openaiKey });
  const questions = await time("OpenAI: generate 10 questions (single call)", async () => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You write the core question plan for a voice-first screening interview.
Return JSON with key \"questions\": an array of exactly 10 strings (no more, no fewer).
Order matters: questions 1–3 are broader context and motivation; 4–7 probe role-specific skills and scenarios; 8–10 are more specific and concrete (including a light close).
Each question must:
- Sound natural spoken aloud (no bullets, no numbering in the text).
- Be one focused prompt, at most 45 words.
- Mix behavioral, role-relevant scenario, and depth appropriate to seniority.
- Avoid duplicates; cover different angles.
- No emojis.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            title: job.title,
            description: job.description,
            seniority: job.seniority,
            required_skills: Array.isArray(job.required_skills)
              ? job.required_skills.map(String)
              : [],
            hiring_priorities: job.hiring_priorities ?? "",
          }),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.65,
    });
    const content = completion.choices?.[0]?.message?.content;
    if (!content) throw new Error("No OpenAI output");
    const parsed = JSON.parse(content);
    const qs = parsed?.questions;
    if (!Array.isArray(qs) || qs.length !== 10) {
      throw new Error(`Expected 10 questions, got ${Array.isArray(qs) ? qs.length : typeof qs}`);
    }
    return qs.map((q) => String(q).trim());
  });

  const limit = pLimit(ttsConcurrency);
  const ttsResults = [];
  const t0TtsAll = now();
  console.log("  TTS: generating + uploading 10 MP3s...");
  await Promise.all(
    questions.map((text, i) =>
      limit(async () => {
        const t0 = now();
        const buf = await deepgramTtsMp3(text);
        const ttsMs = durMs(t0);
        const path = jobQuestionTtsPath(jobId, i);
        const t1 = now();
        const { error } = await admin.storage.from(BUCKET).upload(path, buf, {
          contentType: "audio/mpeg",
          upsert: true,
        });
        const uploadMs = durMs(t1);
        if (error) throw new Error(error.message);
        ttsResults[i] = { text, path, ttsMs, uploadMs };
      }),
    ),
  );
  console.log(`  TTS+upload total: ${durMs(t0TtsAll)}ms`);

  await time("DB: update job.interview_questions with tts_path", async () => {
    const items = ttsResults.map((r) => ({
      id: crypto.randomUUID(),
      text: r.text,
      tts_path: r.path,
    }));
    const { error } = await admin.from("jobs").update({ interview_questions: items }).eq("id", jobId);
    if (error) throw error;
  });

  const slowest = [...ttsResults]
    .map((r, idx) => ({ idx, ...r, total: r.ttsMs + r.uploadMs }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  console.log("\nTop 3 slowest question audio tasks:");
  for (const r of slowest) {
    console.log(
      `  #${r.idx + 1}: tts=${r.ttsMs}ms upload=${r.uploadMs}ms total=${r.total}ms -> ${r.path}`,
    );
  }

  console.log(`\nCreated benchmark job: ${jobId}`);
  console.log("If you want it auto-cleaned up, tell me and I’ll add a flag to delete the job + audio.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

