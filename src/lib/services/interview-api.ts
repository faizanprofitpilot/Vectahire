import { createAdminClient } from "@/lib/supabase/admin";
import { textToSpeechMp3, transcribeAudio } from "@/lib/deepgram";
import {
  parseInterviewQuestions,
  type InterviewQuestionItem,
} from "@/lib/jobs/interview-questions";
import { PLANNED_INTERVIEW_QUESTION_COUNT } from "@/lib/interview/constants";
import { computeInterviewProgress } from "@/lib/interview/progress";
import { signedUrlForJobQuestionAudio } from "@/lib/jobs/job-question-tts";
import { requireSessionVideoPath } from "@/lib/interview/session-auth";

export type AnswerStepResult =
  | { error: string }
  | { ok: true; done: true }
  | {
      ok: true;
      done: false;
      sequence: number;
      questionText: string;
      audioUrl: string | null;
      audioBase64: string | null;
      mime: string;
      prefetchAudioUrl: string | null;
      progress: { current: number; total: number };
    };

export type StartInterviewResult =
  | { error: string; status?: string }
  | { ok: true; done: true; message: string }
  | {
      ok: true;
      done: false;
      sequence: number;
      questionText: string;
      audioUrl: string | null;
      audioBase64: string | null;
      mime: string;
      prefetchAudioUrl: string | null;
      progress: { current: number; total: number };
    };

export async function loadSessionBundle(sessionId: string) {
  const admin = createAdminClient();
  const { data: session, error } = await admin
    .from("interview_sessions")
    .select(
      `
      id,
      status,
      started_at,
      ended_at,
      application_id,
      applications (
        jobs (
          id,
          title,
          description,
          seniority,
          required_skills,
          hiring_priorities,
          interview_focus,
          interview_questions,
          employers ( company_name )
        ),
        candidates ( id, full_name, email )
      )
    `,
    )
    .eq("id", sessionId)
    .single();

  if (error || !session) return { error: "not_found" as const };

  const rawApp = session.applications as unknown;
  const appRow = Array.isArray(rawApp) ? rawApp[0] : rawApp;
  const app = appRow as {
    jobs: {
      id: string;
      title: string;
      description: string;
      seniority: string;
      required_skills: unknown;
      hiring_priorities: string | null;
      interview_focus: unknown;
      interview_questions: unknown;
      employers: { company_name: string } | null;
    } | null;
    candidates: { id: string; full_name: string | null; email: string } | null;
  } | null;

  return { session, job: app?.jobs ?? null, candidate: app?.candidates ?? null };
}

function requireTenQuestionPlan(
  planned: InterviewQuestionItem[],
): { ok: true } | { error: "interview_plan_invalid" } {
  if (planned.length !== PLANNED_INTERVIEW_QUESTION_COUNT) {
    return { error: "interview_plan_invalid" };
  }
  return { ok: true };
}

/** Next question from the fixed 10-question bank (rowCount = number of transcript rows). */
function nextQuestionFromEmployerPlan(
  planned: InterviewQuestionItem[],
  rowCount: number,
): { text: string } | { done: true } {
  if (rowCount >= planned.length) return { done: true };
  const text = planned[rowCount]!.text.trim();
  if (!text) return { done: true };
  return { text };
}

async function audioForQuestion(
  planned: InterviewQuestionItem[],
  planIndex: number,
): Promise<{ audioUrl: string | null; audioBase64: string | null; mime: string }> {
  const item = planned[planIndex];
  if (!item) {
    return { audioUrl: null, audioBase64: null, mime: "audio/mpeg" };
  }
  if (item.tts_path) {
    const url = await signedUrlForJobQuestionAudio(item.tts_path);
    if (url) {
      return { audioUrl: url, audioBase64: null, mime: "audio/mpeg" };
    }
  }
  const buf = await textToSpeechMp3(item.text);
  return {
    audioUrl: null,
    audioBase64: buf.toString("base64"),
    mime: "audio/mpeg",
  };
}

async function prefetchForSequence(
  planned: InterviewQuestionItem[],
  /** 1-based sequence of the question we are returning */
  currentSequence: number,
): Promise<string | null> {
  if (currentSequence >= PLANNED_INTERVIEW_QUESTION_COUNT) return null;
  const nextIdx = currentSequence;
  if (nextIdx >= planned.length) return null;
  const p = planned[nextIdx]?.tts_path;
  if (!p) return null;
  return signedUrlForJobQuestionAudio(p);
}

/** Replace answer text with Deepgram transcript when background refinement runs. */
function refineAnswerTranscriptFromAudio(
  rowId: string,
  audioBuffer: Buffer,
  audioMime: string,
) {
  void (async () => {
    try {
      const { transcript, confidence } = await transcribeAudio(audioBuffer, audioMime);
      const admin = createAdminClient();
      await admin
        .from("interview_transcripts")
        .update({
          answer_text: transcript,
          stt_confidence: confidence,
        })
        .eq("id", rowId);
    } catch (e) {
      console.error("[interview] background STT failed", rowId, e);
    }
  })();
}

export async function ensureFirstQuestionOrResume(
  sessionId: string,
): Promise<StartInterviewResult> {
  const admin = createAdminClient();
  const bundle = await loadSessionBundle(sessionId);
  if ("error" in bundle) {
    return { error: bundle.error ?? "unknown" };
  }
  const { session, job } = bundle;
  if (!job) return { error: "no_job" as const };

  if (session.status === "completed" || session.status === "abandoned") {
    return { error: "closed", status: session.status };
  }

  const plannedQuestions = parseInterviewQuestions(job.interview_questions);
  const planOk = requireTenQuestionPlan(plannedQuestions);
  if ("error" in planOk) {
    return { error: planOk.error };
  }

  const now = new Date().toISOString();
  if (session.status === "pending") {
    await Promise.all([
      admin
        .from("interview_sessions")
        .update({ status: "in_progress", started_at: now })
        .eq("id", sessionId),
      admin
        .from("applications")
        .update({ status: "in_progress" })
        .eq("id", session.application_id),
    ]);
  }

  const { data: lines } = await admin
    .from("interview_transcripts")
    .select("*")
    .eq("session_id", sessionId)
    .order("sequence", { ascending: true });

  const rows = lines ?? [];

  const open = rows.filter((r) => !r.answer_text?.trim());
  if (open.length > 0) {
    const lastOpen = open[open.length - 1]!;
    const planIdx = Math.max(0, lastOpen.sequence - 1);
    const primary = await audioForQuestion(plannedQuestions, planIdx);
    const prefetch = await prefetchForSequence(plannedQuestions, lastOpen.sequence);
    return {
      ok: true as const,
      done: false as const,
      sequence: lastOpen.sequence,
      questionText: lastOpen.question_text,
      audioUrl: primary.audioUrl,
      audioBase64: primary.audioBase64,
      mime: primary.mime,
      prefetchAudioUrl: prefetch,
      progress: computeInterviewProgress(job.interview_questions, lastOpen.sequence),
    };
  }

  const nextSeq = rows.length === 0 ? 1 : Math.max(...rows.map((r) => r.sequence)) + 1;

  const next = nextQuestionFromEmployerPlan(plannedQuestions, rows.length);
  if ("done" in next) {
    return { ok: true as const, done: true as const, message: "" };
  }
  const q = next.text;
  const askedAt = now;
  const insertRes = await admin.from("interview_transcripts").insert({
    session_id: sessionId,
    sequence: nextSeq,
    question_text: q,
    answer_text: "",
    is_follow_up: false,
    asked_at: askedAt,
  });
  if (insertRes.error) {
    return { error: insertRes.error.message };
  }

  const planIdx = nextSeq - 1;
  const primary = await audioForQuestion(plannedQuestions, planIdx);
  const prefetch = await prefetchForSequence(plannedQuestions, nextSeq);

  return {
    ok: true as const,
    done: false as const,
    sequence: nextSeq,
    questionText: q,
    audioUrl: primary.audioUrl,
    audioBase64: primary.audioBase64,
    mime: primary.mime,
    prefetchAudioUrl: prefetch,
    progress: computeInterviewProgress(job.interview_questions, nextSeq),
  };
}

export type ProcessAnswerOptions = {
  /** Primary transcript for fast turn progression (browser STT / captions). */
  answerText?: string | null;
  /** Optional; refinement only when answerText is set. */
  audioBuffer?: Buffer | null;
  audioMime?: string | null;
};

export async function processAnswerAndNextQuestion(
  sessionId: string,
  sequence: number,
  options: ProcessAnswerOptions,
): Promise<AnswerStepResult> {
  const admin = createAdminClient();
  const bundle = await loadSessionBundle(sessionId);
  if ("error" in bundle) {
    return { error: bundle.error ?? "unknown" };
  }
  const { session, job } = bundle;
  if (!job) return { error: "no_job" as const };
  if (session.status !== "in_progress") {
    return { error: "not_in_progress" as const };
  }

  const plannedQuestions = parseInterviewQuestions(job.interview_questions);
  const planOk = requireTenQuestionPlan(plannedQuestions);
  if ("error" in planOk) {
    return { error: planOk.error };
  }

  const { data: row, error: rowErr } = await admin
    .from("interview_transcripts")
    .select("*")
    .eq("session_id", sessionId)
    .eq("sequence", sequence)
    .single();

  if (rowErr || !row) return { error: "bad_sequence" as const };

  const textTrim = options.answerText?.trim() ?? "";
  const hasAudio =
    options.audioBuffer && options.audioBuffer.length > 0;

  let transcript: string;
  let confidence: number | null = null;

  if (textTrim.length > 0) {
    transcript = textTrim;
    await admin
      .from("interview_transcripts")
      .update({
        answer_text: transcript,
        answered_at: new Date().toISOString(),
        stt_confidence: null,
      })
      .eq("id", row.id);
    if (hasAudio && options.audioBuffer) {
      refineAnswerTranscriptFromAudio(
        row.id,
        options.audioBuffer,
        options.audioMime || "audio/webm",
      );
    }
  } else if (hasAudio && options.audioBuffer) {
    const stt = await transcribeAudio(
      options.audioBuffer,
      options.audioMime || "audio/webm",
    );
    transcript = stt.transcript;
    confidence = stt.confidence;
    await admin
      .from("interview_transcripts")
      .update({
        answer_text: transcript,
        answered_at: new Date().toISOString(),
        stt_confidence: confidence,
      })
      .eq("id", row.id);
  } else {
    return { error: "answer_required" as const };
  }

  const { data: linesAfter } = await admin
    .from("interview_transcripts")
    .select("*")
    .eq("session_id", sessionId)
    .order("sequence", { ascending: true });

  const linesBeforeRows = linesAfter ?? [];
  const nextSeq = Math.max(...linesBeforeRows.map((r) => r.sequence)) + 1;

  const nextQ = nextQuestionFromEmployerPlan(plannedQuestions, linesBeforeRows.length);
  if ("done" in nextQ) {
    return { ok: true as const, done: true as const };
  }

  const q = nextQ.text;
  const askedAt = new Date().toISOString();
  const insertRes = await admin.from("interview_transcripts").insert({
    session_id: sessionId,
    sequence: nextSeq,
    question_text: q,
    answer_text: "",
    is_follow_up: false,
    asked_at: askedAt,
  });
  if (insertRes.error) {
    return { error: insertRes.error.message };
  }

  const planIdx = nextSeq - 1;
  const primary = await audioForQuestion(plannedQuestions, planIdx);
  const prefetch = await prefetchForSequence(plannedQuestions, nextSeq);

  return {
    ok: true as const,
    done: false as const,
    sequence: nextSeq,
    questionText: q,
    audioUrl: primary.audioUrl,
    audioBase64: primary.audioBase64,
    mime: primary.mime,
    prefetchAudioUrl: prefetch,
    progress: computeInterviewProgress(job.interview_questions, nextSeq),
  };
}

/** Background-only: run Deepgram on answer audio and overwrite transcript row. */
export async function ingestAnswerAudioForRefinement(
  sessionId: string,
  sequence: number,
  audioBuffer: Buffer,
  audioMime: string,
): Promise<{ error: string } | { ok: true }> {
  const admin = createAdminClient();
  const bundle = await loadSessionBundle(sessionId);
  if ("error" in bundle) return { error: bundle.error ?? "unknown" };
  if (bundle.session.status !== "in_progress") {
    return { error: "not_in_progress" };
  }

  const { data: row, error: rowErr } = await admin
    .from("interview_transcripts")
    .select("id")
    .eq("session_id", sessionId)
    .eq("sequence", sequence)
    .single();

  if (rowErr || !row) return { error: "bad_sequence" };

  refineAnswerTranscriptFromAudio(row.id, audioBuffer, audioMime);
  return { ok: true };
}

export async function createInterviewVideoUploadUrl(sessionId: string): Promise<
  | { error: string }
  | { ok: true; path: string; signedUrl: string; token: string }
> {
  const admin = createAdminClient();
  const bundle = await loadSessionBundle(sessionId);
  if ("error" in bundle) return { error: bundle.error ?? "unknown" };
  const path = `${sessionId}/recording.webm`;
  const { data, error } = await admin.storage
    .from("interview-videos")
    .createSignedUploadUrl(path, { upsert: true });
  if (error || !data) return { error: error?.message ?? "upload_url_failed" };
  return { ok: true as const, path, signedUrl: data.signedUrl, token: data.token };
}

export async function markSessionCompleteWithVideoPath(
  sessionId: string,
  path: string,
  durationSeconds: number,
): Promise<
  { error: string } | { ok: true; already: true } | { ok: true; path: string }
> {
  if (!requireSessionVideoPath(sessionId, path)) {
    return { error: "invalid_video_path" };
  }
  const admin = createAdminClient();
  const bundle = await loadSessionBundle(sessionId);
  if ("error" in bundle) return { error: bundle.error ?? "unknown" };
  const { session } = bundle;

  if (session.status === "completed") {
    return { ok: true as const, already: true as const };
  }

  const ended = new Date().toISOString();
  await admin
    .from("interview_sessions")
    .update({
      status: "completed",
      ended_at: ended,
      duration_seconds: Math.round(durationSeconds),
      video_storage_path: path,
      transcript_complete: true,
      scoring_status: "pending",
    })
    .eq("id", sessionId);

  await admin
    .from("applications")
    .update({ status: "completed", stage: "review" })
    .eq("id", session.application_id);

  return { ok: true as const, path };
}

/**
 * Candidate closed the tab or left abruptly during the interview.
 * Marks the session completed without video and queues scoring from whatever transcript exists.
 */
export async function finalizeInterviewSessionEarly(sessionId: string): Promise<
  { error: string } | { ok: true; already: boolean }
> {
  const admin = createAdminClient();
  const bundle = await loadSessionBundle(sessionId);
  if ("error" in bundle) return { error: bundle.error ?? "unknown" };
  const { session } = bundle;

  if (session.status === "completed") {
    return { ok: true as const, already: true as const };
  }
  if (session.status !== "in_progress") {
    return { error: "not_in_progress" as const };
  }

  const ended = new Date().toISOString();
  const startedMs = session.started_at
    ? new Date(session.started_at).getTime()
    : Date.now();
  const durationSeconds = Math.max(0, Math.round((Date.now() - startedMs) / 1000));

  const { data: updated, error: upErr } = await admin
    .from("interview_sessions")
    .update({
      status: "completed",
      ended_at: ended,
      duration_seconds: durationSeconds,
      video_storage_path: null,
      transcript_complete: true,
      scoring_status: "pending",
    })
    .eq("id", sessionId)
    .eq("status", "in_progress")
    .select("id")
    .maybeSingle();

  if (upErr) return { error: upErr.message };
  if (!updated) {
    const { data: again } = await admin
      .from("interview_sessions")
      .select("status")
      .eq("id", sessionId)
      .single();
    if (again?.status === "completed") {
      return { ok: true as const, already: true as const };
    }
    return { error: "finalize_conflict" as const };
  }

  await admin
    .from("applications")
    .update({ status: "completed", stage: "review" })
    .eq("id", session.application_id);

  return { ok: true as const, already: false as const };
}
