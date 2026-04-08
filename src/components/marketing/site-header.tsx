import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/#value", label: "Platform" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[oklch(0.9_0.02_250)]/80 bg-[oklch(0.99_0.008_250)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <BrandLogo href="/" size="md" priority wordmark className="-ml-0.5" />
        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-[oklch(0.4_0.03_260)] transition-colors hover:text-[oklch(0.22_0.04_260)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button
            size="sm"
            className="rounded-full bg-[oklch(0.28_0.08_260)] px-5 text-white shadow-md shadow-[oklch(0.28_0.08_260)]/25 hover:bg-[oklch(0.32_0.09_260)]"
            asChild
          >
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
