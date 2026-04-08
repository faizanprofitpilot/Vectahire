"use client";

import { Subtitles } from "lucide-react";
import { cn } from "@/lib/utils";

export function LiveCaptionsOverlay({
  text,
  active,
  supported,
}: {
  text: string;
  active: boolean;
  supported: boolean;
}) {
  if (!active) return null;

  if (!supported) {
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-3 sm:p-4">
        <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-black/55 px-4 py-2.5 text-center backdrop-blur-sm">
          <p className="text-[11px] leading-relaxed text-[oklch(0.82_0.02_260)]">
            Live captions are not available in this browser. Your answer is still recorded. Try
            Chrome or Edge for captions next time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-3 sm:p-4"
      aria-live="polite"
    >
      <div
        className={cn(
          "w-full max-w-2xl overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-t from-black/85 via-black/70 to-black/45 px-4 py-3 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.65)] backdrop-blur-md",
          "ring-1 ring-white/10",
        )}
      >
        <div className="mb-2 flex items-center gap-2">
          <Subtitles className="size-3.5 text-[oklch(0.88_0.06_195)]" strokeWidth={2} />
          <span className="relative flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[oklch(0.82_0.04_260)]">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[oklch(0.72_0.18_145)] opacity-70" />
              <span className="relative inline-flex size-1.5 rounded-full bg-[oklch(0.78_0.16_150)]" />
            </span>
            Live captions
          </span>
        </div>
        <p
          className={cn(
            "min-h-[2.75rem] text-[15px] font-medium leading-snug tracking-wide text-[oklch(0.97_0.01_260)] antialiased [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]",
            !text.trim() && "text-[oklch(0.65_0.02_260)]",
          )}
        >
          {text.trim()
            ? text
            : "Listening… speak clearly and we will show your words here."}
        </p>
      </div>
    </div>
  );
}
