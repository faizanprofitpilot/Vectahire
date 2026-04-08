import type { ReactNode } from "react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[oklch(0.99_0.008_250)] text-foreground antialiased">
      {children}
    </div>
  );
}
