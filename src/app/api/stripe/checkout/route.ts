import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureEmployer } from "@/lib/services/employer";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const employer = await ensureEmployer(user);

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return NextResponse.json({ error: "missing_price" }, { status: 500 });
  }

  const stripe = getStripe();

  let customerId = employer.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: employer.email,
      name: employer.company_name || employer.full_name || undefined,
      metadata: {
        employer_id: employer.id,
        user_id: employer.user_id,
      },
    });
    customerId = customer.id;
    await supabase
      .from("employers")
      .update({ stripe_customer_id: customerId })
      .eq("id", employer.id);
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    new URL(request.url).origin;
  const successUrl = `${origin}/dashboard?checkout=success`;
  const cancelUrl = `${origin}/dashboard/settings?checkout=cancel`;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: {
        employer_id: employer.id,
      },
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: "checkout_unavailable" }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}

