import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadEnv } from "@/lib/env";

const valid = {
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://launchpad:launchpad@localhost:5432/launchpad",
  BETTER_AUTH_SECRET: "a".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
  STRIPE_SECRET_KEY: "sk_test_123",
  STRIPE_WEBHOOK_SECRET: "whsec_test",
  STRIPE_PRICE_ID: "price_test",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_123",
  EMAIL_FROM: "hello@example.com",
};

describe("loadEnv", () => {
  it("returns parsed env for a valid development payload", () => {
    const result = loadEnv(valid);
    expect(result.DATABASE_URL).toContain("postgresql://");
    expect(result.NETWORK).toBe("base-sepolia");
  });

  it("throws when DATABASE_URL is missing", () => {
    const { DATABASE_URL: _, ...rest } = valid;
    expect(() => loadEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it("throws when BETTER_AUTH_SECRET is shorter than 32 characters", () => {
    expect(() => loadEnv({ ...valid, BETTER_AUTH_SECRET: "short" })).toThrow(
      /BETTER_AUTH_SECRET/,
    );
  });

  it("requires RESEND_API_KEY in production", () => {
    expect(() =>
      loadEnv({ ...valid, NODE_ENV: "production" }),
    ).toThrow(/RESEND_API_KEY/);
  });

  it("requires RESOURCE_WALLET_ADDRESS in production", () => {
    expect(() =>
      loadEnv({
        ...valid,
        NODE_ENV: "production",
        RESEND_API_KEY: "re_test",
      }),
    ).toThrow(/RESOURCE_WALLET_ADDRESS/);
  });

  it("rejects Google client id without secret", () => {
    expect(() =>
      loadEnv({ ...valid, GOOGLE_CLIENT_ID: "id-only" }),
    ).toThrow(/GOOGLE_CLIENT/);
  });
});

describe("env", () => {
  const previous: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.resetModules();
    for (const [key, value] of Object.entries(valid)) {
      previous[key] = process.env[key];
      process.env[key] = value;
    }
  });

  afterEach(() => {
    for (const key of Object.keys(valid)) {
      const prior = previous[key];
      if (prior === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prior;
      }
    }
    vi.resetModules();
  });

  it("loads process.env once and returns the memoized result", async () => {
    const { env } = await import("@/lib/env");
    const first = env();
    const second = env();
    expect(first.DATABASE_URL).toContain("postgresql://");
    expect(first.NETWORK).toBe("base-sepolia");
    expect(second).toBe(first);
  });
});
