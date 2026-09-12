import { describe, expect, it, vi } from "vitest";

const limit = vi.fn();
const orderBy = vi.fn(() => ({ limit }));
const where = vi.fn(() => ({ orderBy }));
const from = vi.fn(() => ({ where }));
const select = vi.fn(() => ({ from }));

vi.mock("@/lib/db", () => ({
  db: { select },
}));

describe("hasActiveSubscription db loader", () => {
  it("returns false when the database has no row", async () => {
    limit.mockResolvedValue([]);
    const { hasActiveSubscription } = await import("@/lib/dal/subscription");
    await expect(
      hasActiveSubscription("u1", new Date("2026-08-21T00:00:00Z")),
    ).resolves.toBe(false);
  });

  it("returns true for an entitling database row", async () => {
    vi.resetModules();
    limit.mockResolvedValue([
      {
        status: "active",
        currentPeriodEnd: new Date("2026-09-21T00:00:00Z"),
      },
    ]);
    const { hasActiveSubscription } = await import("@/lib/dal/subscription");
    await expect(
      hasActiveSubscription("u1", new Date("2026-08-21T00:00:00Z")),
    ).resolves.toBe(true);
  });
});
