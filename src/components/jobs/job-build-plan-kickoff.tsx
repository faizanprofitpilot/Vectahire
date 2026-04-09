"use client";

import { useEffect } from "react";

export function JobBuildPlanKickoff({ jobId }: { jobId: string }) {
  useEffect(() => {
    const ctrl = new AbortController();
    void fetch(`/api/jobs/${jobId}/build-plan`, {
      method: "POST",
      signal: ctrl.signal,
    }).catch(() => {});
    return () => ctrl.abort();
  }, [jobId]);

  return null;
}

