"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { inviteCandidatesToJob } from "@/app/(employer)/dashboard/jobs/invite-actions";

export function InviteCandidatesForm({ jobId }: { jobId: string }) {
  const [emails, setEmails] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await inviteCandidatesToJob(jobId, emails);
    setLoading(false);
    if ("error" in res && res.error) {
      toast.error(res.error);
      return;
    }
    if ("success" in res && res.success) {
      toast.success(`Sent ${res.count} invite(s).`);
      setEmails("");
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="invite_emails">Candidate emails</Label>
        <Textarea
          id="invite_emails"
          rows={3}
          placeholder="one@email.com, other@email.com"
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
        />
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="rounded-full shadow-sm shadow-primary/10"
      >
        {loading ? "Sending…" : "Send invites"}
      </Button>
    </form>
  );
}
