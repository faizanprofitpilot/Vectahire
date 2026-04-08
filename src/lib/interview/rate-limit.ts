type Bucket = { count: number; resetAt: number };

const store: Map<string, Bucket> = (() => {
  const g = globalThis as unknown as { __vhRateLimit?: Map<string, Bucket> };
  if (!g.__vhRateLimit) g.__vhRateLimit = new Map();
  return g.__vhRateLimit;
})();

function getIp(request: Request): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function rateLimitOrNull(
  request: Request,
  keyParts: { scope: string; sessionId: string },
  opts: { max: number; windowMs: number },
): Response | null {
  const ip = getIp(request);
  const key = `${keyParts.scope}:${keyParts.sessionId}:${ip}`;
  const now = Date.now();

  const existing = store.get(key);
  if (!existing || now >= existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs });
    return null;
  }

  existing.count += 1;
  if (existing.count <= opts.max) return null;

  const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  return Response.json(
    { error: "rate_limited" },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
      },
    },
  );
}

