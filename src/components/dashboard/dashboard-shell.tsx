"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  LogOut,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Separator } from "@/components/ui/separator";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/jobs", label: "Jobs", icon: Briefcase },
  { href: "/dashboard/candidates", label: "Candidates", icon: Users },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({
  companyName,
  userEmail,
  children,
}: {
  companyName: string;
  userEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function navActive(href: string) {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[oklch(0.99_0.008_250)] md:flex-row">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_55%_40%_at_100%_-10%,oklch(0.65_0.1_280_/_0.08),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_50%_35%_at_0%_100%,oklch(0.7_0.1_200_/_0.07),transparent)]"
        aria-hidden
      />

      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center border-b border-[oklch(0.9_0.02_250)] bg-[oklch(0.99_0.008_250)]/88 px-4 backdrop-blur-md md:hidden">
        <BrandLogo href="/dashboard" size="sm" wordmark />
      </header>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[oklch(0.9_0.02_250)] bg-[oklch(0.995_0.006_250)]/95 text-sidebar-foreground shadow-[4px_0_24px_-12px_oklch(0.25_0.04_260_/_0.08)] backdrop-blur-xl md:flex">
        <div className="flex h-[4.25rem] items-center px-6">
          <BrandLogo href="/dashboard" size="md" wordmark />
        </div>
        <Separator className="bg-[oklch(0.92_0.015_250)]" />
        <nav className="flex flex-1 flex-col gap-1 p-4">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = navActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-[oklch(0.94_0.04_250)] text-[oklch(0.18_0.05_260)] shadow-sm ring-1 ring-[oklch(0.88_0.03_250)]"
                    : "text-[oklch(0.4_0.03_260)] hover:bg-[oklch(0.97_0.015_250)] hover:text-[oklch(0.22_0.04_260)]",
                )}
              >
                <Icon
                  className={cn(
                    "size-[18px] shrink-0",
                    active ? "text-[oklch(0.45_0.12_200)]" : "opacity-75",
                  )}
                  strokeWidth={1.75}
                />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[oklch(0.92_0.015_250)] p-4">
          <p className="truncate text-xs font-semibold text-[oklch(0.28_0.04_260)]">
            {companyName}
          </p>
          <p className="truncate text-xs text-[oklch(0.48_0.02_260)]">{userEmail}</p>
          <div className="mt-3 flex flex-col gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-full justify-start gap-2 rounded-lg text-[oklch(0.38_0.03_260)] hover:bg-[oklch(0.96_0.02_250)] hover:text-[oklch(0.22_0.04_260)]"
              onClick={() => void signOut()}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      <div className="relative flex flex-1 flex-col md:pl-64">
        <main className="relative flex-1 px-4 pb-24 pt-6 sm:px-8 sm:py-10 md:pb-10">
          {children}
        </main>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch justify-around gap-1 border-t border-[oklch(0.9_0.02_250)] bg-[oklch(0.99_0.008_250)]/94 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden"
        aria-label="Primary"
      >
        {nav.map(({ href, label, icon: Icon }) => {
          const active = navActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition-colors",
                active
                  ? "text-[oklch(0.28_0.08_260)]"
                  : "text-[oklch(0.48_0.02_260)]",
              )}
            >
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-xl transition-colors",
                  active
                    ? "bg-[oklch(0.94_0.04_250)] text-[oklch(0.45_0.12_200)]"
                    : "text-[oklch(0.45_0.02_260)]",
                )}
              >
                <Icon className="size-[18px]" strokeWidth={1.75} />
              </span>
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
