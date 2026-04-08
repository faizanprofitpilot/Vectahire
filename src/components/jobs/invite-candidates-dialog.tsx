"use client";

import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InviteCandidatesForm } from "@/components/jobs/invite-candidates-form";

export function InviteCandidatesDialog({ jobId }: { jobId: string }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button className="gap-2 rounded-full shadow-sm shadow-primary/10" />}>
        <Mail className="size-4" />
        Invite candidates
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Invite candidates</DialogTitle>
          <DialogDescription>
            They receive a link to complete voice and video on their time. You get transcript,
            scores, and rankings when they finish.
          </DialogDescription>
        </DialogHeader>
        <InviteCandidatesForm jobId={jobId} />
      </DialogContent>
    </Dialog>
  );
}
