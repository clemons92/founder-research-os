import { describe, expect, it } from "vitest";
import { createHasActiveSubscription } from "@/lib/dal/subscription";

const now = new Date("2026-08-21T00:00:00Z");

describe("hasActiveSubscription", () => {
  it("is true when the store returns an entitling row", async () => {
    const hasActiveSubscription = createHasActiveSubscription(async () => ({
      status: "active",
      currentPeriodEnd: new Date("2026-09-21T00:00:00Z"),
    }));
    await expect(hasActiveSubscription("u1", now)).resolves.toBe(true);
  });

  it("is false when the user has no subscription row", async () => {
    const hasActiveSubscription = createHasActiveSubscription(async () => null);
    await expect(hasActiveSubscription("u1", now)).resolves.toBe(false);
  });
});
