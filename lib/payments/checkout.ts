import { desc, eq } from "drizzle-orm";
import { env } from "@/lib/env";
import type { UserDTO } from "@/lib/dal/user";
import { getStripe } from "@/lib/payments/stripe";

function appBaseUrl(): string {
  return env().BETTER_AUTH_URL.replace(/\/$/, "");
}

export async function createCheckoutUrl(user: UserDTO): Promise<string> {
  const stripe = getStripe();
  const base = appBaseUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: env().STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${base}/billing?success=1`,
    cancel_url: `${base}/billing?canceled=1`,
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: { userId: user.id },
    subscription_data: { metadata: { userId: user.id } },
  });
  if (!session.url) {
    throw new Error("Stripe checkout session did not return a URL");
  }
  return session.url;
}

export async function createPortalUrl(user: UserDTO): Promise<string> {
  const { db } = await import("@/lib/db");
  const { subscription } = await import("@/lib/db/schema");
  const rows = await db
    .select({ stripeCustomerId: subscription.stripeCustomerId })
    .from(subscription)
    .where(eq(subscription.userId, user.id))
    .orderBy(desc(subscription.currentPeriodEnd))
    .limit(1);
  const customerId = rows[0]?.stripeCustomerId;
  if (!customerId) {
    throw new Error("No billing account yet. Subscribe first.");
  }
  const stripe = getStripe();
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appBaseUrl()}/billing`,
  });
  return portal.url;
}
