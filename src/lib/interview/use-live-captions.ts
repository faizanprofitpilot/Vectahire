"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Minimal typing for Web Speech API (DOM lib may omit these in some TS configs). */
type SpeechRecInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: { resultIndex: number; results: SpeechRecResultList }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecResultList = {
  length: number;
  [index: number]: {
    isFinal: boolean;
    [j: number]: { transcript: string };
  };
};

type SpeechRecCtor = new () => SpeechRecInstance;

function getSpeechRecognitionCtor(): SpeechRecCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecCtor;
    webkitSpeechRecognition?: SpeechRecCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Browser live transcription while the user speaks (pairs with MediaRecorder).
 * Uses the Web Speech API; quality varies by browser (Chrome is strongest).
 */
export function useLiveCaptions() {
  const [captionText, setCaptionText] = useState("");
  const [supported, setSupported] = useState(false);
  const finalRef = useRef("");
  /** Latest full line for flush when stopping (matches on-screen caption). */
  const lastLineRef = useRef("");
  const activeRef = useRef(false);
  const recognitionRef = useRef<SpeechRecInstance | null>(null);

  useEffect(() => {
    setSupported(getSpeechRecognitionCtor() !== null);
  }, []);

  /** Stops recognition and returns the last caption line (for fast server turn without waiting for STT). */
  const stop = useCallback((): string => {
    const flushed = lastLineRef.current.trim();
    lastLineRef.current = "";
    activeRef.current = false;
    const r = recognitionRef.current;
    recognitionRef.current = null;
    if (r) {
      r.onend = null;
      try {
        r.abort();
      } catch {
        try {
          r.stop();
        } catch {
          /* ignore */
        }
      }
    }
    setCaptionText("");
    return flushed;
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    stop();
    finalRef.current = "";
    lastLineRef.current = "";
    setCaptionText("");
    activeRef.current = true;

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US";

    rec.onresult = (event: { resultIndex: number; results: SpeechRecResultList }) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result?.[0]) continue;
        const piece = result[0].transcript;
        if (result.isFinal) finalRef.current += piece;
        else interim += piece;
      }
      const line = (finalRef.current + interim).replace(/\s+/g, " ").trim();
      lastLineRef.current = line;
      setCaptionText(line);
    };

    rec.onerror = () => {
      /* noisy-canceled is common when stopping; ignore */
    };

    rec.onend = () => {
      if (activeRef.current && recognitionRef.current === rec) {
        try {
          rec.start();
        } catch {
          /* already running */
        }
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      activeRef.current = false;
    }
  }, [stop]);

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  return { captionText, supported, start, stop };
}
