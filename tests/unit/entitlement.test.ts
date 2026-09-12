import { describe, expect, it } from "vitest";
import { isEntitlingStatus } from "@/lib/payments/sync";

const now = new Date("2026-08-21T00:00:00Z");

describe("isEntitlingStatus", () => {
  it("is true for active with a future period end", () => {
    expect(
      isEntitlingStatus("active", new Date("2026-09-21T00:00:00Z"), now),
    ).toBe(true);
  });

  it("is true for trialing with a future period end", () => {
    expect(
      isEntitlingStatus("trialing", new Date("2026-09-21T00:00:00Z"), now),
    ).toBe(true);
  });

  it("is false for canceled even if period end is in the future", () => {
    expect(
      isEntitlingStatus("canceled", new Date("2026-09-21T00:00:00Z"), now),
    ).toBe(false);
  });

  it("is false for active with an expired period", () => {
    expect(
      isEntitlingStatus("active", new Date("2026-07-01T00:00:00Z"), now),
    ).toBe(false);
  });
});
