import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

const cols = [
  {
    title: "Product",
    links: [
      { href: "/#value", label: "Platform" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#pricing", label: "Pricing" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Sign in" },
      { href: "/signup", label: "Create account" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-[oklch(0.9_0.02_250)] bg-[oklch(0.97_0.012_250)]">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div>
            <BrandLogo href="/" size="lg" />
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-[oklch(0.45_0.02_260)]">
              Async AI-led voice and video interviews for serious hiring teams.
            </p>
          </div>
          <div className="flex flex-wrap gap-12 sm:gap-16">
            {cols.map((col) => (
              <div key={col.title}>
                <p className="text-xs font-semibold uppercase tracking-wider text-[oklch(0.45_0.02_260)]">
                  {col.title}
                </p>
                <ul className="mt-4 space-y-2">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="text-sm text-[oklch(0.35_0.03_260)] transition-colors hover:text-[oklch(0.22_0.04_260)]"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-12 border-t border-[oklch(0.9_0.02_250)] pt-8 text-center text-xs text-[oklch(0.5_0.02_260)]">
          © {new Date().getFullYear()} VectaHire. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
