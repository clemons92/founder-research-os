import { describe, expect, it, vi } from "vitest";

const onConflictDoUpdate = vi.fn(async () => undefined);
const insertValues = vi.fn(() => ({ onConflictDoUpdate }));
const insert = vi.fn(() => ({ values: insertValues }));
const where = vi.fn(async () => undefined);
const set = vi.fn(() => ({ where }));
const update = vi.fn(() => ({ set }));

vi.mock("@/lib/db", () => ({
  db: { insert, update },
}));

describe("subscription persistence", () => {
  const row = {
    id: "sub_1",
    userId: "u1",
    stripeCustomerId: "cus_1",
    stripeSubscriptionId: "sub_1",
    status: "active",
    priceId: "price_test",
    currentPeriodEnd: new Date("2026-09-21T00:00:00Z"),
  };

  it("upserts by stripeSubscriptionId without mutating the input", async () => {
    const snapshot = { ...row };
    const { upsertSubscriptionFromStripe } = await import("@/lib/payments/sync");
    await upsertSubscriptionFromStripe(row);
    expect(row).toEqual(snapshot);
    expect(insertValues).toHaveBeenCalledWith(row);
    expect(onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({
          userId: "u1",
          status: "active",
          priceId: "price_test",
        }),
      }),
    );
  });

  it("marks a subscription canceled", async () => {
    vi.resetModules();
    const { markSubscriptionCanceled } = await import("@/lib/payments/sync");
    await markSubscriptionCanceled("sub_1", row.currentPeriodEnd);
    expect(set).toHaveBeenCalledWith({
      status: "canceled",
      currentPeriodEnd: row.currentPeriodEnd,
    });
  });
});
