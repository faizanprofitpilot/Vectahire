import Stripe from "stripe";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  if (!cached) {
    // Match the installed Stripe SDK's pinned API version type.
    cached = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
  }
  return cached;
}

