"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserMinus } from "lucide-react";
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
import { deleteApplication } from "@/app/(employer)/dashboard/candidates/actions";

/** Removes the application for this role only (candidate may still exist for other roles). */
export function RemoveFromJobButton({
  applicationId,
  candidateName,
}: {
  applicationId: string;
  candidateName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function confirm() {
    startTransition(async () => {
      const res = await deleteApplication(applicationId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Removed from this role");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-full text-xs text-muted-foreground hover:text-destructive"
          />
        }
      >
        <UserMinus className="mr-1 size-3.5" />
        Remove
      </DialogTrigger>
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove from this role?</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{candidateName}</span> will be removed
            from this opening only. Their profile stays if they are on other roles.
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
            {pending ? "Removing…" : "Remove from role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
