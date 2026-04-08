"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /**
   * Delay in ms. Use small values (0–240) for premium stagger.
   */
  delayMs?: number;
  /**
   * IntersectionObserver threshold.
   */
  threshold?: number;
  /**
   * Root margin string, e.g. "0px 0px -10% 0px".
   */
  rootMargin?: string;
};

export function Reveal({
  children,
  className,
  delayMs = 0,
  threshold = 0.18,
  rootMargin = "0px 0px -8% 0px",
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Avoid observers when user prefers reduced motion.
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    ) {
      setInView(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            obs.disconnect();
            break;
          }
        }
      },
      { threshold, rootMargin }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [rootMargin, threshold]);

  return (
    <div
      ref={ref}
      className={`vh-reveal ${inView ? "vh-reveal--in" : ""} ${className ?? ""}`}
      style={{ ["--vh-reveal-delay" as never]: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}

