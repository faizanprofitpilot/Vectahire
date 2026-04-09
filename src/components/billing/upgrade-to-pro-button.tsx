"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function UpgradeToProButton() {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "checkout_failed");
      }
      window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={onClick}
      disabled={loading}
      className="rounded-full bg-[oklch(0.28_0.08_260)] text-white hover:bg-[oklch(0.32_0.09_260)]"
    >
      {loading ? "Redirecting…" : "Upgrade to Pro"}
    </Button>
  );
}

