import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/dal/user", () => ({
  requireUser: vi.fn(async () => ({
    id: "u1",
    email: "a@b.com",
    name: "A",
    image: null,
    emailVerified: true,
  })),
}));

vi.mock("@/lib/db", () => ({ db: {} }));

vi.mock("@/lib/ratelimit", () => ({
  enforceRateLimit: vi.fn(async () => ({ allowed: true })),
  createPostgresRateLimitStore: vi.fn(() => ({})),
}));

vi.mock("@/lib/payments/checkout", () => ({
  createCheckoutUrl: vi.fn(async () => "https://checkout.test"),
  createPortalUrl: vi.fn(async () => "https://portal.test"),
}));

vi.mock("@/lib/payments/stripe", () => ({
  isStripeConfigured: () => false,
  getStripe: vi.fn(),
}));

import { openPortal, startCheckout } from "@/app/(app)/actions/billing";

describe("billing actions when Stripe is not configured", () => {
  it("startCheckout returns an error instead of throwing", async () => {
    const result = await startCheckout();
    expect(result).toEqual({ error: "Billing is not configured yet." });
  });

  it("openPortal returns an error instead of throwing", async () => {
    const result = await openPortal();
    expect(result).toEqual({ error: "Billing is not configured yet." });
  });
});
