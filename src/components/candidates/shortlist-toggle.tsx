"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setApplicationShortlisted } from "@/app/(employer)/dashboard/candidates/actions";
import { cn } from "@/lib/utils";

export function ShortlistToggle({
  applicationId,
  shortlisted,
}: {
  applicationId: string;
  shortlisted: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const next = !shortlisted;
      const res = await setApplicationShortlisted(applicationId, next);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(next ? "Shortlisted" : "Removed from shortlist");
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn(
        "size-8 text-muted-foreground hover:text-foreground",
        shortlisted && "text-amber-600 hover:text-amber-700",
      )}
      aria-label={shortlisted ? "Remove from shortlist" : "Shortlist candidate"}
      disabled={pending}
      onClick={toggle}
    >
      <Star className={cn("size-4", shortlisted ? "fill-current" : "fill-transparent")} />
    </Button>
  );
}

