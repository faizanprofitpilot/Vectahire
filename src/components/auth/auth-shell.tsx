import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const NOISE_BG =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E\")";

export function AuthShell({
  children,
  maxWidthClass = "max-w-md",
}: {
  children: ReactNode;
  maxWidthClass?: "max-w-md" | "max-w-lg";
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-15%,oklch(0.72_0.12_200_/_0.18),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_100%_0%,oklch(0.62_0.12_280_/_0.1),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{ backgroundImage: NOISE_BG }}
        aria-hidden
      />
      <div className={cn("relative w-full", maxWidthClass)}>{children}</div>
    </div>
  );
}
