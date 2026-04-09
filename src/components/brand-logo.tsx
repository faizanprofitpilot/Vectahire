"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/logo.png";

const sizeClass = {
  sm: "h-7 max-h-7",
  md: "h-8 max-h-8",
  lg: "h-10 max-h-10",
} as const;

const wordmarkClass = {
  sm: "font-[family-name:var(--font-display-marketing)] text-base font-semibold tracking-tight text-[oklch(0.22_0.04_260)]",
  md: "font-[family-name:var(--font-display-marketing)] text-lg font-semibold tracking-tight text-[oklch(0.22_0.04_260)]",
  lg: "font-[family-name:var(--font-display-marketing)] text-xl font-semibold tracking-tight text-[oklch(0.22_0.04_260)]",
} as const;

type Size = keyof typeof sizeClass;

type BrandLogoProps = {
  href?: string | null;
  className?: string;
  imageClassName?: string;
  size?: Size;
  priority?: boolean;
  /** Show the product name next to the mark (e.g. nav headers). */
  wordmark?: boolean;
};

/**
 * Product logo from `/public/logo.png`. Use `href={null}` for a non-link mark.
 */
export function BrandLogo({
  href = "/",
  className,
  imageClassName,
  size = "md",
  priority = false,
  wordmark = false,
}: BrandLogoProps) {
  const img = (
    <Image
      src={LOGO_SRC}
      alt={wordmark ? "" : "VectaHire"}
      width={200}
      height={56}
      priority={priority}
      aria-hidden={wordmark || undefined}
      className={cn(
        "w-auto shrink-0 object-contain object-left",
        sizeClass[size],
        imageClassName,
      )}
    />
  );

  const inner = (
    <>
      {img}
      {wordmark ? (
        <span className={cn("whitespace-nowrap", wordmarkClass[size])}>
          Vectahire
        </span>
      ) : null}
    </>
  );

  const rowClass = cn(
    "inline-flex items-center gap-2",
    wordmark ? "gap-2.5" : null,
    className,
  );

  if (href === null) {
    return <span className={rowClass}>{inner}</span>;
  }

  return (
    <Link
      href={href}
      className={cn("shrink-0", rowClass)}
      aria-label="Vectahire home"
    >
      {inner}
    </Link>
  );
}
