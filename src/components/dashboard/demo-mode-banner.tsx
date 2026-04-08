import Link from "next/link";
import { Button } from "@/components/ui/button";

export function DemoModeBanner() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[oklch(0.55_0.12_200_/_0.35)] bg-[oklch(0.97_0.02_250)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[oklch(0.32_0.04_260)]">
        <span className="font-medium">Sample dashboard.</span> Numbers and rows are illustrative;
        your workspace is unchanged.
      </p>
      <Button variant="outline" size="sm" className="shrink-0 rounded-full" asChild>
        <Link href="/dashboard">Back to live data</Link>
      </Button>
    </div>
  );
}
