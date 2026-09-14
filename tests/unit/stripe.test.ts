import { afterEach, describe, expect, it, vi } from "vitest";

const envState: { STRIPE_SECRET_KEY?: string } = {
  STRIPE_SECRET_KEY: "sk_test_123",
};

vi.mock("@/lib/env", () => ({
  env: () => envState,
}));

describe("isStripeConfigured", () => {
  afterEach(() => {
    envState.STRIPE_SECRET_KEY = "sk_test_123";
  });

  it("is true when STRIPE_SECRET_KEY is present", async () => {
    vi.resetModules();
    const { isStripeConfigured } = await import("@/lib/payments/stripe");
    expect(isStripeConfigured()).toBe(true);
  });

  it("is false when STRIPE_SECRET_KEY is missing", async () => {
    envState.STRIPE_SECRET_KEY = undefined;
    vi.resetModules();
    const { isStripeConfigured } = await import("@/lib/payments/stripe");
    expect(isStripeConfigured()).toBe(false);
  });
});

describe("getStripe", () => {
  afterEach(() => {
    envState.STRIPE_SECRET_KEY = "sk_test_123";
  });

  it("throws when Stripe is not configured", async () => {
    envState.STRIPE_SECRET_KEY = undefined;
    vi.resetModules();
    const { getStripe } = await import("@/lib/payments/stripe");
    expect(() => getStripe()).toThrow(/Stripe is not configured/);
  });

  it("returns a Stripe client when a secret key is present", async () => {
    vi.resetModules();
    const { getStripe } = await import("@/lib/payments/stripe");
    const client = getStripe();
    expect(client).toBeDefined();
    expect(typeof client.webhooks.constructEvent).toBe("function");
  });
});
