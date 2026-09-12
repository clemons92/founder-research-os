import { desc, eq } from "drizzle-orm";
import { env } from "@/lib/env";
import type { UserDTO } from "@/lib/dal/user";
import { getStripe } from "@/lib/payments/stripe";

export type CheckoutSessionCreate = (params: {
  mode: "subscription";
  line_items: Array<{ price: string; quantity: number }>;
  success_url: string;
  cancel_url: string;
  customer_email: string;
  client_reference_id: string;
  metadata: { userId: string };
  subscription_data: { metadata: { userId: string } };
}) => Promise<{ url: string | null }>;

export type PortalSessionCreate = (params: {
  customer: string;
  return_url: string;
}) => Promise<{ url: string }>;

export type CheckoutDeps = {
  createCheckoutSession?: CheckoutSessionCreate;
  createPortalSession?: PortalSessionCreate;
  loadCustomerId?: (userId: string) => Promise<string | undefined>;
  baseUrl?: string;
  priceId?: string;
};

function appBaseUrl(baseUrl?: string): string {
  return (baseUrl ?? env().BETTER_AUTH_URL).replace(/\/$/, "");
}

async function defaultLoadCustomerId(userId: string): Promise<string | undefined> {
  const { db } = await import("@/lib/db");
  const { subscription } = await import("@/lib/db/schema");
  const rows = await db
    .select({ stripeCustomerId: subscription.stripeCustomerId })
    .from(subscription)
    .where(eq(subscription.userId, userId))
    .orderBy(desc(subscription.currentPeriodEnd))
    .limit(1);
  return rows[0]?.stripeCustomerId;
}

export async function createCheckoutUrl(
  user: UserDTO,
  deps: CheckoutDeps = {},
): Promise<string> {
  const createSession =
    deps.createCheckoutSession ??
    ((params) => getStripe().checkout.sessions.create(params));
  const base = appBaseUrl(deps.baseUrl);
  const priceId = deps.priceId ?? env().STRIPE_PRICE_ID;
  const session = await createSession({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
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

export async function createPortalUrl(
  user: UserDTO,
  deps: CheckoutDeps = {},
): Promise<string> {
  const loadCustomerId = deps.loadCustomerId ?? defaultLoadCustomerId;
  const customerId = await loadCustomerId(user.id);
  if (!customerId) {
    throw new Error("No billing account yet. Subscribe first.");
  }
  const createPortal =
    deps.createPortalSession ??
    ((params) => getStripe().billingPortal.sessions.create(params));
  const portal = await createPortal({
    customer: customerId,
    return_url: `${appBaseUrl(deps.baseUrl)}/billing`,
  });
  return portal.url;
}
