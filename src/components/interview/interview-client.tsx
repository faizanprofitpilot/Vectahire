"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Video, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  elapsedSecondsSince,
  markSessionStartTime,
} from "@/lib/interview/timing";
import { useLiveCaptions } from "@/lib/interview/use-live-captions";
import { LiveCaptionsOverlay } from "@/components/interview/live-captions-overlay";
import { PLANNED_INTERVIEW_QUESTION_COUNT } from "@/lib/interview/constants";
import { uploadInterviewRecording } from "@/lib/interview/upload-session-video";

type Meta = {
  status: string;
  jobTitle: string;
  companyName: string;
  candidateName: string;
};

type Phase = "load" | "check" | "live" | "uploading" | "done" | "error" | "closed";

function tryParseJson<T>(raw: string): T | null {
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Human-readable error when `fetch` returns !ok (handles empty or non-JSON bodies). */
async function readErrorFromResponse(res: Response, fallback: string): Promise<string> {
  const text = await res.text();
  if (!text.trim()) return `${fallback} (${res.status})`;
  const parsed = tryParseJson<{ error?: string }>(text);
  if (parsed?.error) return parsed.error;
  const snippet = text.replace(/\s+/g, " ").trim().slice(0, 240);
  return snippet || `${fallback} (${res.status})`;
}

export function InterviewClient({ sessionId, token }: { sessionId: string; token: string }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [phase, setPhase] = useState<Phase>("load");
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [, setSequence] = useState<number | null>(null);
  const [question, setQuestion] = useState<string>("");
  const [micLevel, setMicLevel] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showDoneSpeaking, setShowDoneSpeaking] = useState(false);
  const [serverBusy, setServerBusy] = useState(false);
  const [interviewProgress, setInterviewProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [deviceNonce, setDeviceNonce] = useState(0);
  const [streamReady, setStreamReady] = useState(false);
  const stopAnswerRef = useRef<(() => void) | null>(null);
  /** Flushed live captions for fast-path answer (skips blocking Deepgram before next question). */
  const lastClientTranscriptRef = useRef("");
  const phaseRef = useRef<Phase>(phase);
  const earlyFinalizeSentRef = useRef(false);

  const streamRef = useRef<MediaStream | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const {
    captionText: liveCaptionText,
    supported: captionsSupported,
    start: startLiveCaptions,
    stop: stopLiveCaptions,
  } = useLiveCaptions();

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreamReady(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    analyserRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/interview/${sessionId}`, {
          headers: { "x-interview-token": token },
        });
        if (!res.ok) {
          setPhase("error");
          setError("This interview link is not valid.");
          return;
        }
        const data = (await res.json()) as Meta;
        if (cancelled) return;
        setMeta(data);
        setFullName((data.candidateName || "").trim());
        // Require explicit confirmation even if we have an email; this is used as the recruiter-facing name.
        setNameConfirmed(false);
        if (data.status === "completed") {
          setPhase("closed");
          return;
        }
        if (data.status === "abandoned") {
          setPhase("error");
          setError("This session is no longer available.");
          return;
        }
        setPhase("check");
      } catch {
        if (!cancelled) {
          setPhase("error");
          setError("Could not load interview.");
        }
      }
    })();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [sessionId, token, stopStream]);

  async function confirmFullName() {
    const next = fullName.trim().replace(/\s+/g, " ");
    if (next.length < 2) {
      setError("Please enter your full name to start.");
      return;
    }
    setSavingName(true);
    setError(null);
    try {
      const res = await fetch(`/api/interview/${sessionId}/candidate`, {
        method: "POST",
          headers: { "Content-Type": "application/json", "x-interview-token": token },
        body: JSON.stringify({ fullName: next }),
      });
      if (!res.ok) {
        const msg = await readErrorFromResponse(res, "Could not save name");
        setError(msg);
        return;
      }
      setNameConfirmed(true);
    } finally {
      setSavingName(false);
    }
  }

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (phase !== "live") setInterviewProgress(null);
  }, [phase]);

  useEffect(() => {
    if (phase !== "live") stopLiveCaptions();
  }, [phase, stopLiveCaptions]);

  useEffect(() => {
    const finalizeEarlyUrl = `${window.location.origin}/api/interview/${sessionId}/finalize-early?t=${encodeURIComponent(
      token,
    )}`;

    function sendBeaconFinalizeEarly() {
      try {
        const blob = new Blob(["{}"], { type: "application/json" });
        const ok = navigator.sendBeacon(finalizeEarlyUrl, blob);
        if (!ok) {
          void fetch(finalizeEarlyUrl, {
            method: "POST",
            keepalive: true,
            headers: { "Content-Type": "application/json" },
            body: "{}",
          });
        }
      } catch {
        void fetch(finalizeEarlyUrl, {
          method: "POST",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
      }
    }

    async function uploadOrFinalizeEarly() {
      // Always attempt to finalize on tab-close. Video upload is best-effort and must not block
      // the session from leaving "Interview live".
      if (earlyFinalizeSentRef.current) return;
      earlyFinalizeSentRef.current = true;

      try {
        // First: fire-and-forget finalize beacon so the session is not left in_progress.
        sendBeaconFinalizeEarly();

        const vr = videoRecorderRef.current;
        if (vr && vr.state === "recording") {
          await new Promise<void>((resolve) => {
            vr.onstop = () => resolve();
            vr.stop();
          });
        }

        const videoBlob = new Blob(videoChunksRef.current, { type: "video/webm" });
        const durationSeconds = elapsedSecondsSince(startedAtRef);

        if (videoBlob.size > 1024) {
          const result = await uploadInterviewRecording(sessionId, token, videoBlob, durationSeconds);
          if (result.ok) return;
        }
      } catch {
        sendBeaconFinalizeEarly();
      }
    }

    function onPageHide() {
      void uploadOrFinalizeEarly();
    }
    function onBeforeUnload() {
      void uploadOrFinalizeEarly();
    }

    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [sessionId, token]);

  const runLevelMeter = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i]!;
      const avg = sum / data.length / 255;
      setMicLevel(Math.min(1, avg * 3));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  async function enableDevices() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;
      setStreamReady(true);
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      runLevelMeter();
      setDeviceNonce((n) => n + 1);
      setPhase("check");
    } catch {
      setError("Microphone and camera access are required for this interview.");
    }
  }

  function playBase64Audio(base64: string, mime: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Audio playback failed"));
      };
      void audio.play().catch(reject);
    });
  }

  function prefetchQuestionAudio(url: string) {
    if (typeof document === "undefined" || !url) return;
    const id = "interview-prefetch-audio";
    document.getElementById(id)?.remove();
    const link = document.createElement("link");
    link.id = id;
    link.rel = "prefetch";
    link.href = url;
    link.as = "fetch";
    document.head.appendChild(link);
  }

  async function playQuestionAudio(a: {
    audioUrl: string | null;
    audioBase64: string | null;
    mime: string;
  }): Promise<void> {
    if (a.audioUrl) {
      await new Promise<void>((resolve, reject) => {
        const el = new Audio(a.audioUrl!);
        el.onended = () => resolve();
        el.onerror = () => reject(new Error("Audio playback failed"));
        void el.play().catch(reject);
      });
      return;
    }
    if (a.audioBase64) {
      await playBase64Audio(a.audioBase64, a.mime ?? "audio/mpeg");
    }
  }

  async function startInterviewLoop() {
    const stream = streamRef.current;
    if (!stream) return;
    setError(null);
    markSessionStartTime(startedAtRef);
    videoChunksRef.current = [];
    // Include mic audio in the session recording — video-only WebM has no candidate voice for employers.
    const vStream = new MediaStream([
      ...stream.getVideoTracks(),
      ...stream.getAudioTracks(),
    ]);
    const sessionMimeCandidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    const sessionMime =
      sessionMimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
    const vr = new MediaRecorder(
      vStream,
      sessionMime ? { mimeType: sessionMime } : undefined,
    );
    videoRecorderRef.current = vr;
    vr.ondataavailable = (e) => {
      if (e.data.size > 0) videoChunksRef.current.push(e.data);
    };
    vr.start(1000);
    setPhase("live");
    const startBusyTimer = setTimeout(() => setServerBusy(true), 320);
    let startRes: Response;
    let startText: string;
    try {
      startRes = await fetch(`/api/interview/${sessionId}/start`, {
        method: "POST",
        headers: { "x-interview-token": token },
      });
      startText = await startRes.text();
    } finally {
      clearTimeout(startBusyTimer);
      setServerBusy(false);
    }
    const startJson = tryParseJson<{
      error?: string;
      done?: boolean;
      sequence?: number;
      questionText?: string;
      audioUrl?: string | null;
      audioBase64?: string | null;
      mime?: string;
      prefetchAudioUrl?: string | null;
      progress?: { current: number; total: number };
    }>(startText) ?? {};
    if (!startRes.ok) {
      setError(
        startJson.error ??
          (startText.trim()
            ? startText.replace(/\s+/g, " ").trim().slice(0, 240)
            : "Could not start interview."),
      );
      setPhase("error");
      return;
    }
    if (startJson.done) {
      await finishSession();
      return;
    }
    const hasStartAudio =
      (startJson.audioUrl && startJson.audioUrl.length > 0) ||
      (startJson.audioBase64 && startJson.audioBase64.length > 0);
    if (startJson.sequence == null || !startJson.questionText || !hasStartAudio) {
      setError("Unexpected start response.");
      setPhase("error");
      return;
    }
    setSequence(startJson.sequence);
    setQuestion(startJson.questionText);
    setInterviewProgress(
      startJson.progress ??
        (typeof startJson.sequence === "number"
          ? { current: startJson.sequence, total: PLANNED_INTERVIEW_QUESTION_COUNT }
          : null),
    );
    if (startJson.prefetchAudioUrl) {
      prefetchQuestionAudio(startJson.prefetchAudioUrl);
    }
    await playQuestionAudio({
      audioUrl: startJson.audioUrl ?? null,
      audioBase64: startJson.audioBase64 ?? null,
      mime: startJson.mime ?? "audio/mpeg",
    });

    let currentSeq = startJson.sequence;
    let continueLoop = true;
    while (continueLoop) {
      const answerBlob = await recordAnswerBlob(
        stream,
        () => {
          setShowDoneSpeaking(true);
          startLiveCaptions();
        },
        () => {
          lastClientTranscriptRef.current = stopLiveCaptions();
          setShowDoneSpeaking(false);
          stopAnswerRef.current = null;
        },
      );
      const answerText = lastClientTranscriptRef.current.trim();
      const usedClientTranscript = answerText.length > 0;

      let slowPathBusyTimer: ReturnType<typeof setTimeout> | undefined;
      if (!usedClientTranscript) {
        slowPathBusyTimer = setTimeout(() => setServerBusy(true), 400);
      }

      let ansRes: Response;
      let ansText: string;

      try {
        if (usedClientTranscript) {
          ansRes = await fetch(`/api/interview/${sessionId}/answer`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-interview-token": token },
            body: JSON.stringify({
              sequence: currentSeq,
              answerText,
            }),
          });
          ansText = await ansRes.text();
          if (answerBlob.size > 256) {
            const fdAudio = new FormData();
            fdAudio.set("sequence", String(currentSeq));
            fdAudio.set("audio", answerBlob, "answer.webm");
            void fetch(`/api/interview/${sessionId}/answer-audio`, {
              method: "POST",
              headers: { "x-interview-token": token },
              body: fdAudio,
            });
          }
        } else {
          const fd = new FormData();
          fd.set("sequence", String(currentSeq));
          fd.set("audio", answerBlob, "answer.webm");
          ansRes = await fetch(`/api/interview/${sessionId}/answer`, {
            method: "POST",
            headers: { "x-interview-token": token },
            body: fd,
          });
          ansText = await ansRes.text();
        }
      } finally {
        if (slowPathBusyTimer) clearTimeout(slowPathBusyTimer);
        setServerBusy(false);
      }

      const ansJson = tryParseJson<{
        error?: string;
        done?: boolean;
        sequence?: number;
        questionText?: string;
        audioUrl?: string | null;
        audioBase64?: string | null;
        mime?: string;
        prefetchAudioUrl?: string | null;
        progress?: { current: number; total: number };
      }>(ansText) ?? {};
      if (!ansRes.ok) {
        setError(
          ansJson.error ??
            (ansText.trim()
              ? ansText.replace(/\s+/g, " ").trim().slice(0, 240)
              : "Could not submit answer."),
        );
        setPhase("error");
        return;
      }
      if (ansJson.done) {
        continueLoop = false;
        break;
      }
      const hasAnsAudio =
        (ansJson.audioUrl && ansJson.audioUrl.length > 0) ||
        (ansJson.audioBase64 && ansJson.audioBase64.length > 0);
      if (
        ansJson.sequence == null ||
        !ansJson.questionText ||
        !hasAnsAudio
      ) {
        setError("Unexpected answer response.");
        setPhase("error");
        return;
      }
      currentSeq = ansJson.sequence;
      setSequence(ansJson.sequence);
      setQuestion(ansJson.questionText);
      setInterviewProgress(
        ansJson.progress ??
          (typeof ansJson.sequence === "number"
            ? { current: ansJson.sequence, total: PLANNED_INTERVIEW_QUESTION_COUNT }
            : null),
      );
      if (ansJson.prefetchAudioUrl) {
        prefetchQuestionAudio(ansJson.prefetchAudioUrl);
      }
      await playQuestionAudio({
        audioUrl: ansJson.audioUrl ?? null,
        audioBase64: ansJson.audioBase64 ?? null,
        mime: ansJson.mime ?? "audio/mpeg",
      });
    }

    await finishSession();
  }

  function recordAnswerBlob(
    stream: MediaStream,
    onStart: () => void,
    onEnd: () => void,
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const audioTracks = stream.getAudioTracks();
      if (!audioTracks.length) {
        reject(new Error("No audio track"));
        return;
      }
      const aStream = new MediaStream(audioTracks);
      const preferred = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const rec = new MediaRecorder(aStream, { mimeType: preferred });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onerror = () => {
        onEnd();
        reject(new Error("Recording failed"));
      };
      rec.onstop = () => {
        onEnd();
        resolve(new Blob(chunks, { type: preferred }));
      };
      stopAnswerRef.current = () => {
        if (rec.state === "recording") rec.stop();
      };
      onStart();
      rec.start();
      const maxMs = 180_000;
      setTimeout(() => {
        if (rec.state === "recording") rec.stop();
      }, maxMs);
    });
  }

  async function finishSession() {
    setPhase("uploading");
    setUploadProgress(10);
    const vr = videoRecorderRef.current;
    if (vr && vr.state === "recording") {
      await new Promise<void>((resolve) => {
        vr.onstop = () => resolve();
        vr.stop();
      });
    }
    const videoBlob = new Blob(videoChunksRef.current, { type: "video/webm" });
    const durationSeconds = elapsedSecondsSince(startedAtRef);
    setUploadProgress(20);

    const result = await uploadInterviewRecording(sessionId, token, videoBlob, durationSeconds, {
      onProgress: setUploadProgress,
    });
    if (!result.ok) {
      setError(
        result.error.includes("too large")
          ? "Video is too large for the backup upload path, and direct storage upload is not available. Check that the interview-videos bucket exists and Supabase storage is configured, or try a shorter recording."
          : result.error,
      );
      setPhase("error");
      return;
    }
    earlyFinalizeSentRef.current = true;
    stopStream();
    setPhase("done");
  }

  const previewVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = previewVideoRef.current;
    const s = streamRef.current;
    if (v && s) {
      v.srcObject = s;
    }
  }, [phase, meta, deviceNonce]);

  if (phase === "load") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (phase === "closed") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-border/80 shadow-lg">
          <CardHeader>
            <CardTitle>Interview already submitted</CardTitle>
            <CardDescription>
              Thank you. The hiring team has your recording on file.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (phase === "error" && !streamReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-destructive/30 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-5" />
              <CardTitle>Unable to continue</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40">
      <div
        className={
          phase === "live"
            ? "mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10"
            : "mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-12"
        }
      >
        <header className="space-y-3 text-center">
          {meta?.companyName ? (
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {meta.companyName}
            </p>
          ) : null}
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {meta?.jobTitle || "Interview"}
          </h1>
          {meta?.candidateName ? (
            <p className="text-sm text-muted-foreground">
              Signed in as {meta.candidateName}
            </p>
          ) : null}
        </header>

        {phase === "check" && (
          <Card className="mx-auto w-full max-w-sm border-border/80 shadow-md">
            <CardHeader>
              <CardTitle>System check</CardTitle>
              <CardDescription>
                We need your camera and microphone. You will hear questions spoken aloud, then
                answer by voice. Your camera records throughout the session.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!nameConfirmed ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Full name</label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      autoComplete="name"
                      autoCapitalize="words"
                      className="h-10"
                    />
                    {meta?.candidateName ? (
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        This is the name the hiring team will see in their candidate list.
                      </p>
                    ) : null}
                  </div>
                  {error ? <p className="text-sm text-destructive">{error}</p> : null}
                  <Button
                    size="lg"
                    className="w-full"
                    disabled={savingName || fullName.trim().length < 2}
                    onClick={() => void confirmFullName()}
                  >
                    {savingName ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Continue
                  </Button>
                </div>
              ) : !streamReady ? (
                <Button size="lg" className="w-full gap-2" onClick={() => void enableDevices()}>
                  <Video className="size-4" />
                  Enable camera & microphone
                </Button>
              ) : (
                <>
                  <div className="overflow-hidden rounded-xl border border-border bg-black/90 shadow-inner">
                    <video
                      ref={previewVideoRef}
                      className="aspect-video w-full object-cover"
                      autoPlay
                      playsInline
                      muted
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Mic className="size-4" />
                        Microphone
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {Math.round(micLevel * 100)}%
                      </span>
                    </div>
                    <Progress value={micLevel * 100} className="h-2" />
                  </div>
                  {error ? <p className="text-sm text-destructive">{error}</p> : null}
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => void startInterviewLoop()}
                  >
                    Start interview
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {phase === "live" && (
          <Card className="border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="relative flex size-3" aria-hidden>
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500/45" />
                  <span className="absolute inline-flex size-full animate-pulse rounded-full bg-red-500/25" />
                  <span className="relative inline-flex size-3 rounded-full bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.18)]" />
                </span>
                Interview in progress
              </CardTitle>
              <CardDescription>
                Listen to each question, then speak clearly when prompted. Stay in frame. While you
                answer, your words can appear as live captions under the video (Chrome or Edge work
                best).
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] lg:items-start">
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-2xl border border-border bg-black/90 shadow-[0_18px_60px_-28px_oklch(0.22_0.06_260_/_0.35)]">
                  <video
                    ref={previewVideoRef}
                    className="aspect-video w-full object-cover"
                    autoPlay
                    playsInline
                    muted
                  />
                  <LiveCaptionsOverlay
                    text={liveCaptionText}
                    active={showDoneSpeaking}
                    supported={captionsSupported}
                  />
                </div>
                {serverBusy ? (
                  <div className="flex items-center gap-3 rounded-xl border border-primary/15 bg-gradient-to-r from-primary/8 to-transparent px-4 py-3 text-sm text-foreground shadow-sm">
                    <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                    <span>{question ? "Preparing your next question…" : "Starting your interview…"}</span>
                  </div>
                ) : null}
              </div>

              <div className="space-y-4">
                {interviewProgress ? (
                  <div className="space-y-2 rounded-2xl border border-border/80 bg-muted/30 px-4 py-3">
                    <div className="flex items-center justify-between gap-3 text-xs font-medium text-muted-foreground">
                      <span>Progress</span>
                      <span className="tabular-nums text-foreground">
                        {interviewProgress.current}/{interviewProgress.total}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(
                        100,
                        (interviewProgress.current / interviewProgress.total) * 100,
                      )}
                      className="h-2.5 bg-muted"
                    />
                  </div>
                ) : null}

                {question ? (
                  <div className="rounded-2xl border border-border bg-card/80 p-4 text-sm leading-relaxed">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Current question
                    </p>
                    <p className="mt-2 text-[15px] leading-relaxed text-foreground">{question}</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-muted/15 p-4 text-sm text-muted-foreground">
                    Your first question will play shortly.
                  </div>
                )}

                {showDoneSpeaking ? (
                  <Button
                    size="lg"
                    className="w-full rounded-xl"
                    variant="secondary"
                    onClick={() => stopAnswerRef.current?.()}
                  >
                    Done speaking
                  </Button>
                ) : (
                  <p className="text-center text-xs leading-relaxed text-muted-foreground">
                    After the question plays, speak your answer, then tap “Done speaking”.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {phase === "uploading" && (
          <Card>
            <CardHeader>
              <CardTitle>Uploading recording</CardTitle>
              <CardDescription>Almost done, keep this tab open.</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={uploadProgress} className="h-2" />
            </CardContent>
          </Card>
        )}

        {phase === "done" && (
          <Card className="border-accent/30 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2 text-accent-foreground">
                <CheckCircle2 className="size-6 text-accent" />
                <CardTitle>You are all set</CardTitle>
              </div>
              <CardDescription>
                Your responses and video are with the hiring team. They will follow up if there is
                a fit.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {phase === "error" && streamReady ? (
          <p className="text-center text-sm text-destructive">{error}</p>
        ) : null}
      </div>
    </div>
  );
}
