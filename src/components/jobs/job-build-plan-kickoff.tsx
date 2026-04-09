"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const POLL_MS = 3500;

/**
 * When this string changes (new question ids/text or tts flags), the effect re-runs so we can
 * schedule TTS again after "Generate" or edits that strip audio paths.
 */
export function JobBuildPlanKickoff({
  jobId,
  kickKey,
}: {
  jobId: string;
  kickKey: string;
}) {
  const router = useRouter();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();

    void (async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/build-plan`, {
          method: "POST",
          signal: ctrl.signal,
        });
        if (!ctrl.signal.aborted && res.ok) {
          router.refresh();
        }
      } catch {
        /* aborted or network */
      }
    })();

    pollRef.current = setInterval(() => {
      void (async () => {
        try {
          const r = await fetch(`/api/jobs/${jobId}/interview-audio-ready`, {
            signal: ctrl.signal,
          });
          if (!r.ok) return;
          const j = (await r.json()) as { ready?: boolean };
          if (j.ready) {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            router.refresh();
          }
        } catch {
          /* aborted */
        }
      })();
    }, POLL_MS);

    return () => {
      ctrl.abort();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobId, kickKey, router]);

  return null;
}
