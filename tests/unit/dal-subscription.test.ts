import { describe, expect, it, vi } from "vitest";
import {
  createHasActiveSubscription,
  createRequireActiveSubscription,
} from "@/lib/dal/subscription";

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

  it("defaults now to the current time", async () => {
    const hasActiveSubscription = createHasActiveSubscription(async () => ({
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 60_000),
    }));
    await expect(hasActiveSubscription("u1")).resolves.toBe(true);
  });
});

describe("requireActiveSubscription", () => {
  const user = {
    id: "u1",
    email: "a@b.com",
    name: "A",
    image: null,
    emailVerified: true,
  };

  it("returns the user when entitled", async () => {
    const requireActive = createRequireActiveSubscription(
      async () => user,
      async () => true,
    );
    await expect(requireActive()).resolves.toEqual(user);
  });

  it("redirects to /billing when not entitled", async () => {
    const redirectTo = vi.fn(() => {
      throw new Error("NEXT_REDIRECT");
    });
    const requireActive = createRequireActiveSubscription(
      async () => user,
      async () => false,
      redirectTo,
    );
    await expect(requireActive()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectTo).toHaveBeenCalledWith("/billing");
  });
});
