import { eq } from "drizzle-orm";

export type SubscriptionWrite = {
  id: string;
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  priceId: string;
  currentPeriodEnd: Date;
};

export type StripeSubscriptionLike = {
  id: string;
  status: string;
  customer?: string | { id: string } | null;
  metadata?: Record<string, string>;
  items?: {
    data: Array<{
      current_period_end: number;
      price?: string | { id: string };
    }>;
  };
  current_period_end?: number;
};

const ENTITLING_STATUSES = new Set(["active", "trialing"]);

export function isEntitlingStatus(
  status: string,
  currentPeriodEnd: Date,
  now: Date,
): boolean {
  return ENTITLING_STATUSES.has(status) && currentPeriodEnd.getTime() > now.getTime();
}

export function periodEndUnixFromSubscription(
  sub: StripeSubscriptionLike,
): number {
  const unix = sub.items?.data[0]?.current_period_end;
  if (typeof unix !== "number") {
    throw new Error("Subscription item current_period_end is missing");
  }
  return unix;
}

export function priceIdFromSubscription(sub: StripeSubscriptionLike): string {
  const price = sub.items?.data[0]?.price;
  if (typeof price === "string" && price.length > 0) {
    return price;
  }
  if (price && typeof price === "object" && price.id) {
    return price.id;
  }
  throw new Error("Subscription item price is missing");
}

export function customerIdFrom(
  value: string | { id: string } | null | undefined,
): string {
  if (!value) {
    throw new Error("Stripe customer id is missing");
  }
  return typeof value === "string" ? value : value.id;
}

export function subscriptionWriteFromCheckout(input: {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  priceId: string;
  currentPeriodEndUnix: number;
}): SubscriptionWrite {
  return {
    id: input.stripeSubscriptionId,
    userId: input.userId,
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    status: input.status,
    priceId: input.priceId,
    currentPeriodEnd: new Date(input.currentPeriodEndUnix * 1000),
  };
}

export function subscriptionWriteFromUpdated(
  sub: StripeSubscriptionLike,
): SubscriptionWrite {
  const userId = sub.metadata?.userId;
  if (!userId) {
    throw new Error("Subscription metadata.userId is missing");
  }
  return subscriptionWriteFromCheckout({
    userId,
    stripeCustomerId: customerIdFrom(sub.customer),
    stripeSubscriptionId: sub.id,
    status: sub.status,
    priceId: priceIdFromSubscription(sub),
    currentPeriodEndUnix: periodEndUnixFromSubscription(sub),
  });
}

export async function upsertSubscriptionFromStripe(
  row: SubscriptionWrite,
): Promise<void> {
  const { db } = await import("@/lib/db");
  const { subscription } = await import("@/lib/db/schema");
  const values = { ...row };
  await db
    .insert(subscription)
    .values(values)
    .onConflictDoUpdate({
      target: subscription.stripeSubscriptionId,
      set: {
        userId: values.userId,
        stripeCustomerId: values.stripeCustomerId,
        status: values.status,
        priceId: values.priceId,
        currentPeriodEnd: values.currentPeriodEnd,
      },
    });
}

export async function markSubscriptionCanceled(
  stripeSubscriptionId: string,
  currentPeriodEnd: Date,
): Promise<void> {
  const { db } = await import("@/lib/db");
  const { subscription } = await import("@/lib/db/schema");
  await db
    .update(subscription)
    .set({ status: "canceled", currentPeriodEnd })
    .where(eq(subscription.stripeSubscriptionId, stripeSubscriptionId));
}
