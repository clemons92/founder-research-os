"use server";

import { requireUser } from "@/lib/dal/user";
import { createCheckoutUrl, createPortalUrl } from "@/lib/payments/checkout";
import { enforceRateLimit } from "@/lib/ratelimit";

const BILLING_ROUTE = "/billing";

async function rateLimitUser(userId: string): Promise<boolean> {
  const { db } = await import("@/lib/db");
  const { createPostgresRateLimitStore } = await import("@/lib/ratelimit");
  const result = await enforceRateLimit({
    userId,
    ip: "action",
    route: BILLING_ROUTE,
    store: createPostgresRateLimitStore(db),
  });
  return result.allowed;
}

export async function startCheckout(): Promise<{ url: string } | { error: string }> {
  const user = await requireUser();
  const allowed = await rateLimitUser(user.id);
  if (!allowed) {
    return { error: "Too many requests" };
  }
  try {
    const url = await createCheckoutUrl(user);
    return { url };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not start checkout.";
    return { error: message };
  }
}

export async function openPortal(): Promise<{ url: string } | { error: string }> {
  const user = await requireUser();
  const allowed = await rateLimitUser(user.id);
  if (!allowed) {
    return { error: "Too many requests" };
  }
  try {
    const url = await createPortalUrl(user);
    return { url };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not open billing portal.";
    return { error: message };
  }
}
