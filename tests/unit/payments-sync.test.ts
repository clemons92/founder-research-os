import { describe, expect, it } from "vitest";
import {
  periodEndUnixFromSubscription,
  subscriptionWriteFromCheckout,
  subscriptionWriteFromUpdated,
} from "@/lib/payments/sync";

describe("subscriptionWriteFromCheckout", () => {
  it("maps checkout.session.completed metadata to a write", () => {
    const row = subscriptionWriteFromCheckout({
      userId: "u1",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
      status: "active",
      priceId: "price_test",
      currentPeriodEndUnix: 1_800_000_000,
    });
    expect(row.userId).toBe("u1");
    expect(row.stripeSubscriptionId).toBe("sub_1");
    expect(row.currentPeriodEnd).toEqual(new Date(1_800_000_000 * 1000));
  });
});

describe("periodEndUnixFromSubscription", () => {
  it("reads current_period_end from the first subscription item", () => {
    const unix = periodEndUnixFromSubscription({
      id: "sub_1",
      status: "active",
      items: { data: [{ current_period_end: 1_800_000_000 }] },
    });
    expect(unix).toBe(1_800_000_000);
  });

  it("does not use a root current_period_end field", () => {
    expect(() =>
      periodEndUnixFromSubscription({
        id: "sub_1",
        status: "active",
        current_period_end: 1_800_000_000,
      }),
    ).toThrow(/current_period_end/);
  });
});

describe("subscriptionWriteFromUpdated", () => {
  it("maps a Stripe subscription object without mutating it", () => {
    const incoming = {
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
    };
    const frozen = { ...incoming };
    const row = subscriptionWriteFromUpdated(incoming);
    expect(row).toMatchObject({
      userId: "u1",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
      status: "active",
      priceId: "price_test",
      currentPeriodEnd: new Date(1_800_000_000 * 1000),
    });
    expect(incoming).toEqual(frozen);
  });
});
