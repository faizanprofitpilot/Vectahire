#!/usr/bin/env node
/**
 * Measures latency of operations that mirror the job-creation path:
 * - Raw HTTP to Supabase
 * - Auth-adjacent REST (service role: simple selects)
 * - A jobs insert + delete with a JSON payload similar to defaultInterviewQuestions
 *
 * Run from repo root:
 *   node --env-file=.env.local scripts/benchmark-job-create-latency.mjs
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL. For DB timings, SUPABASE_SERVICE_ROLE_KEY must be set.
 */

import { performance } from "node:perf_hooks";
import { createClient } from "@supabase/supabase-js";

function ms(t0) {
  return Math.round(performance.now() - t0);
}

async function time(label, fn) {
  const t0 = performance.now();
  try {
    const result = await fn();
    console.log(`  ${label}: ${ms(t0)}ms`);
    return result;
  } catch (e) {
    console.log(`  ${label}: FAIL after ${ms(t0)}ms — ${e?.message ?? e}`);
    throw e;
  }
}

function makeFakeInterviewQuestions() {
  const rows = [];
  for (let i = 0; i < 10; i++) {
    rows.push({
      id: crypto.randomUUID(),
      text: `Benchmark question ${i + 1}: tell me about your experience with async job flows and latency measurement.`,
    });
  }
  return rows;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("\n=== VectaHire job-create latency probe ===\n");

  if (!url) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL");
    process.exit(1);
  }

  await time("HTTP GET (Supabase project URL, no auth)", async () => {
    const r = await fetch(url, { method: "GET" });
    await r.arrayBuffer();
  });

  if (anon) {
    await time("REST GET /auth/v1/health (anon)", async () => {
      const r = await fetch(`${url}/auth/v1/health`, {
        headers: {
          apikey: anon,
          Authorization: `Bearer ${anon}`,
        },
      });
      await r.text();
    });
  } else {
    console.log("  (skip auth health: no NEXT_PUBLIC_SUPABASE_ANON_KEY)\n");
  }

  if (!service) {
    console.log(
      "\nNo SUPABASE_SERVICE_ROLE_KEY — stopping before DB round-trips.",
      "Add the service role key to .env.local to benchmark inserts/selects.\n",
    );
    return;
  }

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await time("DB: select 1 row from employers", async () => {
    const { error } = await admin.from("employers").select("id").limit(1).maybeSingle();
    if (error) throw error;
  });

  const { data: emp, error: empErr } = await admin
    .from("employers")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (empErr || !emp?.id) {
    console.log("  Cannot benchmark job insert: no employer row found.");
    return;
  }

  const payload = {
    employer_id: emp.id,
    title: "[benchmark] latency probe — safe to delete",
    description: "x".repeat(500),
    required_skills: ["a", "b", "c"],
    seniority: "mid",
    location: "Remote",
    interview_questions: makeFakeInterviewQuestions(),
  };

  let jobId;
  await time("DB: insert jobs row (with 10-question JSON)", async () => {
    const { data, error } = await admin.from("jobs").insert(payload).select("id").single();
    if (error) throw error;
    jobId = data.id;
  });

  if (jobId) {
    await time("DB: delete benchmark job row", async () => {
      const { error } = await admin.from("jobs").delete().eq("id", jobId);
      if (error) throw error;
    });
  }

  console.log(`
Interpretation:
- If HTTP/DB numbers above are low (<500ms) but the UI still takes ~30s+, the bottleneck is
  likely NOT your Supabase project — e.g. Vercel/serverless cold start, Next.js server action
  + revalidatePath work, or network between browser and region.
- If DB selects/inserts are already multi-second, fix region/network/Supabase plan issues first.
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
