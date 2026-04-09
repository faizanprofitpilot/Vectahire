import { headers } from "next/headers";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizeSubStatus(
  status: Stripe.Subscription.Status,
): "active" | "trialing" | "past_due" | "canceled" {
  if (status === "trialing") return "trialing";
  if (status === "active") return "active";
  if (status === "past_due") return "past_due";
  return "canceled";
}

function isPaidEntitled(status: Stripe.Subscription.Status): boolean {
  return status === "active" || status === "trialing";
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ error: "missing_webhook_secret" }, { status: 500 });
  }

  const sig = (await headers()).get("stripe-signature");
  if (!sig) {
    return Response.json({ error: "missing_signature" }, { status: 400 });
  }

  const stripe = getStripe();

  let event: Stripe.Event;
  const payload = await request.text();
  try {
    event = stripe.webhooks.constructEvent(payload, sig, secret);
  } catch {
    return Response.json({ error: "invalid_signature" }, { status: 400 });
  }

  const type = event.type;
  if (
    type !== "customer.subscription.created" &&
    type !== "customer.subscription.updated" &&
    type !== "customer.subscription.deleted"
  ) {
    return Response.json({ received: true });
  }

  const sub = event.data.object as Stripe.Subscription;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) {
    return Response.json({ error: "missing_customer" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: employer } = await admin
    .from("employers")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!employer?.id) {
    // Unknown customer; acknowledge so Stripe doesn't retry forever.
    return Response.json({ received: true });
  }

  const entitled = isPaidEntitled(sub.status);
  const tier = entitled ? ("pro" as const) : ("free" as const);
  const status = normalizeSubStatus(sub.status);
  const priceId = sub.items.data[0]?.price?.id ?? null;
  const currentPeriodEndSeconds = (sub as unknown as { current_period_end?: number })
    .current_period_end;
  const currentPeriodEnd = currentPeriodEndSeconds
    ? new Date(currentPeriodEndSeconds * 1000).toISOString()
    : null;

  await admin
    .from("employers")
    .update({ subscription_tier: tier })
    .eq("id", employer.id);

  await admin
    .from("employer_subscriptions")
    .upsert(
      {
        employer_id: employer.id,
        tier,
        status,
        stripe_subscription_id: sub.id,
        stripe_price_id: priceId,
        current_period_end: currentPeriodEnd,
      },
      { onConflict: "employer_id" },
    );

  return Response.json({ received: true });
}

