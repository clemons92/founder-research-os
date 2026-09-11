import { describe, expect, it, vi } from "vitest";
import type { RateLimitStore } from "@/lib/ratelimit";
import { createWebhookHandler } from "@/app/api/stripe/webhook/route";
import type { SubscriptionWrite } from "@/lib/payments/sync";

function memoryStore(): RateLimitStore {
  const rows = new Map<string, { count: number; windowStart: Date }>();
  return {
    async get(key) {
      const row = rows.get(key);
      return row ? { ...row } : null;
    },
    async set(key, count, windowStart) {
      rows.set(key, { count, windowStart: new Date(windowStart) });
    },
  };
}

const checkoutEvent = {
  type: "checkout.session.completed",
  data: {
    object: {
      mode: "subscription",
      metadata: { userId: "u1" },
      client_reference_id: "u1",
      customer: "cus_1",
      subscription: {
        id: "sub_1",
        status: "active",
        customer: "cus_1",
        metadata: { userId: "u1" },
        items: {
          data: [
            {
              current_period_end: 1_800_000_000,
              price: { id: "price_test" },
            },
          ],
        },
      },
    },
  },
};

function post(body: string, signature?: string) {
  const headers = new Headers({ "content-type": "application/json" });
  if (signature) {
    headers.set("stripe-signature", signature);
  }
  return new Request("http://localhost:3000/api/stripe/webhook", {
    method: "POST",
    headers,
    body,
  });
}

describe("POST /api/stripe/webhook", () => {
  it("upserts from checkout.session.completed after verifying the raw body", async () => {
    const upsert = vi.fn(async (_row: SubscriptionWrite) => undefined);
    const rawBody = JSON.stringify({ type: "checkout.session.completed" });
    const verify = vi.fn((raw: string, signature: string) => {
      expect(raw).toBe(rawBody);
      expect(signature).toBe("sig_test");
      return checkoutEvent;
    });
    const handler = createWebhookHandler({
      verify,
      sync: { upsert, markCanceled: vi.fn() },
      store: memoryStore(),
    });

    const response = await handler(post(rawBody, "sig_test"));

    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0]?.[0]).toMatchObject({
      userId: "u1",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
      status: "active",
      priceId: "price_test",
      currentPeriodEnd: new Date(1_800_000_000 * 1000),
    });
  });

  it("returns 400 when the signature is missing", async () => {
    const handler = createWebhookHandler({
      verify: vi.fn(),
      sync: { upsert: vi.fn(), markCanceled: vi.fn() },
      store: memoryStore(),
    });
    const response = await handler(post("{}"));
    expect(response.status).toBe(400);
  });

  it("returns 400 when verify throws", async () => {
    const handler = createWebhookHandler({
      verify: () => {
        throw new Error("bad sig");
      },
      sync: { upsert: vi.fn(), markCanceled: vi.fn() },
      store: memoryStore(),
    });
    const response = await handler(post("{}", "sig_bad"));
    expect(response.status).toBe(400);
  });

  it("returns 200 and does not sync unknown event types", async () => {
    const upsert = vi.fn();
    const markCanceled = vi.fn();
    const handler = createWebhookHandler({
      verify: () => ({ type: "invoice.paid", data: { object: {} } }),
      sync: { upsert, markCanceled },
      store: memoryStore(),
    });
    const response = await handler(post("{}", "sig_test"));
    expect(response.status).toBe(200);
    expect(upsert).not.toHaveBeenCalled();
    expect(markCanceled).not.toHaveBeenCalled();
  });
});
