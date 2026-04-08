/** Shared client logic: upload session recording via signed URL or multipart fallback. */

export type UploadInterviewRecordingResult =
  | { ok: true }
  | { ok: false; error: string };

function tryParseJson<T>(raw: string): T | null {
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function readErrorFromResponse(res: Response, fallback: string): Promise<string> {
  const text = await res.text();
  if (!text.trim()) return `${fallback} (${res.status})`;
  const parsed = tryParseJson<{ error?: string }>(text);
  if (parsed?.error) return parsed.error;
  const snippet = text.replace(/\s+/g, " ").trim().slice(0, 240);
  return snippet || `${fallback} (${res.status})`;
}

/**
 * Uploads the WebM blob and finalizes the session (same paths as the normal end-of-interview flow).
 */
export async function uploadInterviewRecording(
  sessionId: string,
  token: string,
  videoBlob: Blob,
  durationSeconds: number,
  options?: { onProgress?: (pct: number) => void },
): Promise<UploadInterviewRecordingResult> {
  const onProgress = options?.onProgress;
  onProgress?.(30);

  const uploadUrlEndpoint = `/api/interview/${sessionId}/video-upload-url`;
  let upRes = await fetch(uploadUrlEndpoint, { method: "POST", headers: { "x-interview-token": token } });
  let upText = await upRes.text();
  let upJson =
    tryParseJson<{ error?: string; signedUrl?: string; path?: string }>(upText) ?? {};
  if (!upRes.ok || !upJson.signedUrl || !upJson.path) {
    await new Promise((r) => setTimeout(r, 350));
    upRes = await fetch(uploadUrlEndpoint, { method: "POST", headers: { "x-interview-token": token } });
    upText = await upRes.text();
    upJson =
      tryParseJson<{ error?: string; signedUrl?: string; path?: string }>(upText) ?? {};
  }

  if (!upRes.ok || !upJson.signedUrl || !upJson.path) {
    const maxMultipartBytes = 4 * 1024 * 1024;
    if (videoBlob.size > maxMultipartBytes) {
      return {
        ok: false,
        error:
          "Video is too large for the backup upload path, and direct storage upload is not available.",
      };
    }
    const fd = new FormData();
    fd.set("video", videoBlob, "session.webm");
    fd.set("durationSeconds", String(durationSeconds));
    onProgress?.(50);
    const res = await fetch(`/api/interview/${sessionId}/complete`, {
      method: "POST",
      headers: { "x-interview-token": token },
      body: fd,
    });
    onProgress?.(100);
    if (!res.ok) {
      return { ok: false, error: await readErrorFromResponse(res, "Upload failed.") };
    }
    return { ok: true };
  }

  onProgress?.(50);
  const putRes = await fetch(upJson.signedUrl, {
    method: "PUT",
    body: videoBlob,
    headers: { "Content-Type": "video/webm" },
  });
  if (!putRes.ok) {
    return { ok: false, error: "Video upload to storage failed." };
  }
  onProgress?.(85);
  const res = await fetch(`/api/interview/${sessionId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-interview-token": token },
    body: JSON.stringify({ path: upJson.path, durationSeconds }),
  });
  onProgress?.(100);
  if (!res.ok) {
    return { ok: false, error: await readErrorFromResponse(res, "Could not finalize interview.") };
  }
  return { ok: true };
}
