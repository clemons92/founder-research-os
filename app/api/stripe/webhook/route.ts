import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/payments/stripe";
import {
  enforceRateLimit,
  type RateLimitStore,
} from "@/lib/ratelimit";
import {
  customerIdFrom,
  markSubscriptionCanceled,
  periodEndUnixFromSubscription,
  priceIdFromSubscription,
  subscriptionWriteFromCheckout,
  subscriptionWriteFromUpdated,
  upsertSubscriptionFromStripe,
  type StripeSubscriptionLike,
  type SubscriptionWrite,
} from "@/lib/payments/sync";

const WEBHOOK_ROUTE = "/api/stripe/webhook";

export type StripeLikeEvent = {
  type: string;
  data: { object: unknown };
};

export type WebhookSync = {
  upsert: (row: SubscriptionWrite) => Promise<void>;
  markCanceled: (
    stripeSubscriptionId: string,
    currentPeriodEnd: Date,
  ) => Promise<void>;
};

export type WebhookDeps = {
  verify: (rawBody: string, signature: string) => StripeLikeEvent;
  sync: WebhookSync;
  store?: RateLimitStore;
  resolveSubscription?: (id: string) => Promise<StripeSubscriptionLike>;
};

type CheckoutSessionLike = {
  mode?: string;
  metadata?: Record<string, string>;
  client_reference_id?: string | null;
  customer?: string | { id: string } | null;
  subscription?: string | StripeSubscriptionLike | null;
};

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first && first.length > 0 ? first : "127.0.0.1";
}

async function loadPostgresStore(): Promise<RateLimitStore> {
  const { db } = await import("@/lib/db");
  const { createPostgresRateLimitStore } = await import("@/lib/ratelimit");
  return createPostgresRateLimitStore(db);
}

async function expandSubscription(
  value: string | StripeSubscriptionLike | null | undefined,
  resolve?: (id: string) => Promise<StripeSubscriptionLike>,
): Promise<StripeSubscriptionLike> {
  if (!value) {
    throw new Error("Checkout session has no subscription");
  }
  if (typeof value !== "string") {
    return value;
  }
  if (!resolve) {
    throw new Error("Subscription id needs resolveSubscription");
  }
  return resolve(value);
}

async function handleCheckoutCompleted(
  session: CheckoutSessionLike,
  deps: WebhookDeps,
): Promise<void> {
  if (session.mode && session.mode !== "subscription") {
    return;
  }
  const userId =
    session.metadata?.userId ?? session.client_reference_id ?? undefined;
  if (!userId) {
    throw new Error("Checkout session is missing userId");
  }
  const sub = await expandSubscription(
    session.subscription,
    deps.resolveSubscription,
  );
  const row = subscriptionWriteFromCheckout({
    userId,
    stripeCustomerId: customerIdFrom(session.customer ?? sub.customer),
    stripeSubscriptionId: sub.id,
    status: sub.status,
    priceId: priceIdFromSubscription(sub),
    currentPeriodEndUnix: periodEndUnixFromSubscription(sub),
  });
  await deps.sync.upsert(row);
}

async function handleSubscriptionEvent(
  type: "updated" | "deleted",
  sub: StripeSubscriptionLike,
  deps: WebhookDeps,
): Promise<void> {
  if (type === "deleted") {
    await deps.sync.markCanceled(
      sub.id,
      new Date(periodEndUnixFromSubscription(sub) * 1000),
    );
    return;
  }
  await deps.sync.upsert(subscriptionWriteFromUpdated(sub));
}

async function dispatchEvent(
  event: StripeLikeEvent,
  deps: WebhookDeps,
): Promise<void> {
  if (event.type === "checkout.session.completed") {
    await handleCheckoutCompleted(event.data.object as CheckoutSessionLike, deps);
    return;
  }
  if (event.type === "customer.subscription.updated") {
    await handleSubscriptionEvent(
      "updated",
      event.data.object as StripeSubscriptionLike,
      deps,
    );
    return;
  }
  if (event.type === "customer.subscription.deleted") {
    await handleSubscriptionEvent(
      "deleted",
      event.data.object as StripeSubscriptionLike,
      deps,
    );
  }
}

export function createWebhookHandler(deps: WebhookDeps) {
  return async function POST(request: Request): Promise<Response> {
    const store = deps.store ?? (await loadPostgresStore());
    const limited = await enforceRateLimit({
      ip: clientIp(request),
      route: WEBHOOK_ROUTE,
      store,
    });
    if (!limited.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const rawBody = await request.text();
    let event: StripeLikeEvent;
    try {
      event = deps.verify(rawBody, signature);
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    try {
      await dispatchEvent(event, deps);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Webhook handler failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  };
}

async function resolveStripeSubscription(
  id: string,
): Promise<StripeSubscriptionLike> {
  return getStripe().subscriptions.retrieve(id);
}

export const POST = createWebhookHandler({
  verify: (rawBody, signature) =>
    getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      env().STRIPE_WEBHOOK_SECRET,
    ) as StripeLikeEvent,
  sync: {
    upsert: upsertSubscriptionFromStripe,
    markCanceled: markSubscriptionCanceled,
  },
  resolveSubscription: resolveStripeSubscription,
});
