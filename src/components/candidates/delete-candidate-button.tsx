"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteCandidate } from "@/app/(employer)/dashboard/candidates/actions";

export function DeleteCandidateButton({
  candidateId,
  displayName,
  variant = "default",
}: {
  candidateId: string;
  displayName: string;
  variant?: "default" | "icon";
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function confirm() {
    startTransition(async () => {
      const res = await deleteCandidate(candidateId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Candidate removed");
      setOpen(false);
      router.push("/dashboard/candidates");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant={variant === "icon" ? "ghost" : "outline"}
            size={variant === "icon" ? "icon-sm" : "sm"}
            className={
              variant === "icon"
                ? "size-8 text-muted-foreground hover:text-destructive"
                : "gap-2 rounded-full text-destructive hover:text-destructive"
            }
            aria-label={`Delete candidate ${displayName}`}
          />
        }
      >
        {variant === "icon" ? <Trash2 className="size-4" /> : (
          <>
            <Trash2 className="size-4" />
            Delete candidate
          </>
        )}
      </DialogTrigger>
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete this candidate?</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{displayName}</span> will be removed
            from every role, along with their interviews and scores. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="rounded-full"
            disabled={pending}
            onClick={() => void confirm()}
          >
            {pending ? "Deleting…" : "Delete candidate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
