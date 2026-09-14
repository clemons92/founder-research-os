import { describe, expect, it, vi } from "vitest";
import { createCheckoutUrl, createPortalUrl } from "@/lib/payments/checkout";

const user = {
  id: "u1",
  email: "a@b.com",
  name: "A",
  image: null,
  emailVerified: true,
};

describe("createCheckoutUrl", () => {
  it("creates a hosted checkout session for the env price", async () => {
    const createCheckoutSession = vi.fn(async () => ({
      url: "https://checkout.stripe.test/session",
    }));
    const url = await createCheckoutUrl(user, {
      createCheckoutSession,
      baseUrl: "http://localhost:3000/",
      priceId: "price_test",
    });
    expect(url).toBe("https://checkout.stripe.test/session");
    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        line_items: [{ price: "price_test", quantity: 1 }],
        customer_email: "a@b.com",
        client_reference_id: "u1",
        metadata: { userId: "u1" },
      }),
    );
  });

  it("throws when the Stripe price id is missing", async () => {
    await expect(
      createCheckoutUrl(user, {
        createCheckoutSession: async () => ({ url: "https://checkout.stripe.test" }),
        baseUrl: "http://localhost:3000",
        priceId: "",
      }),
    ).rejects.toThrow(/Stripe is not configured/);
  });

  it("throws when Stripe omits the session url", async () => {
    await expect(
      createCheckoutUrl(user, {
        createCheckoutSession: async () => ({ url: null }),
        baseUrl: "http://localhost:3000",
        priceId: "price_test",
      }),
    ).rejects.toThrow(/url/i);
  });
});

describe("createPortalUrl", () => {
  it("opens the billing portal for the stored customer", async () => {
    const createPortalSession = vi.fn(async () => ({
      url: "https://billing.stripe.test/portal",
    }));
    const url = await createPortalUrl(user, {
      createPortalSession,
      loadCustomerId: async () => "cus_1",
      baseUrl: "http://localhost:3000",
    });
    expect(url).toBe("https://billing.stripe.test/portal");
    expect(createPortalSession).toHaveBeenCalledWith({
      customer: "cus_1",
      return_url: "http://localhost:3000/billing",
    });
  });

  it("throws when the user has no Stripe customer", async () => {
    await expect(
      createPortalUrl(user, {
        loadCustomerId: async () => undefined,
        baseUrl: "http://localhost:3000",
      }),
    ).rejects.toThrow(/Subscribe first/);
  });
});
