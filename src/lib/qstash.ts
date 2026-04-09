import { Client, Receiver } from "@upstash/qstash";

export function getQStashClient() {
  const token = process.env.QSTASH_TOKEN;
  if (!token) throw new Error("Missing QSTASH_TOKEN");
  return new Client({ token });
}

export function getQStashReceiver() {
  const current = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const next = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (!current || !next) {
    throw new Error("Missing QStash signing keys");
  }
  return new Receiver({ currentSigningKey: current, nextSigningKey: next });
}

export function appOriginFromRequest(request: Request): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    new URL(request.url).origin
  );
}

export function appOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
}

