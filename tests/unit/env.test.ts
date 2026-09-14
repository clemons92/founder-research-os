import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadEnv } from "@/lib/env";

const valid = {
  DATABASE_URL: "postgresql://launchpad:launchpad@localhost:5432/launchpad",
  BETTER_AUTH_SECRET: "a".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
};

describe("loadEnv", () => {
  it("boots with only the three core variables", () => {
    const result = loadEnv(valid);
    expect(result.DATABASE_URL).toContain("postgresql://");
    expect(result.NETWORK).toBe("base-sepolia");
    expect(result.SOLANA_NETWORK).toBe("solana-devnet");
    expect(result.EMAIL_FROM).toBe("onboarding@resend.dev");
    expect(result.STRIPE_SECRET_KEY).toBeUndefined();
    expect(result.RESEND_API_KEY).toBeUndefined();
    expect(result.RESOURCE_WALLET_ADDRESS).toBeUndefined();
  });

  it("throws when DATABASE_URL is missing", () => {
    const rest: Record<string, string | undefined> = { ...valid };
    delete rest.DATABASE_URL;
    expect(() => loadEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it("throws when BETTER_AUTH_SECRET is shorter than 32 characters", () => {
    expect(() => loadEnv({ ...valid, BETTER_AUTH_SECRET: "short" })).toThrow(
      /BETTER_AUTH_SECRET/,
    );
  });

  it("boots in production without Resend or a resource wallet", () => {
    const result = loadEnv({ ...valid, NODE_ENV: "production" });
    expect(result.NODE_ENV).toBe("production");
    expect(result.RESEND_API_KEY).toBeUndefined();
    expect(result.RESOURCE_WALLET_ADDRESS).toBeUndefined();
  });

  it("accepts optional Stripe keys when they have a valid format", () => {
    const result = loadEnv({
      ...valid,
      STRIPE_SECRET_KEY: "sk_test_123",
      STRIPE_WEBHOOK_SECRET: "whsec_test",
      STRIPE_PRICE_ID: "price_test",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_123",
    });
    expect(result.STRIPE_SECRET_KEY).toBe("sk_test_123");
    expect(result.STRIPE_PRICE_ID).toBe("price_test");
  });

  it("rejects STRIPE_SECRET_KEY that does not start with sk_", () => {
    expect(() =>
      loadEnv({ ...valid, STRIPE_SECRET_KEY: "not-a-key" }),
    ).toThrow(/STRIPE_SECRET_KEY/);
  });

  it("rejects Google client id without secret", () => {
    expect(() =>
      loadEnv({ ...valid, GOOGLE_CLIENT_ID: "id-only" }),
    ).toThrow(/GOOGLE_CLIENT/);
  });

  it("accepts Google when both client id and secret are set", () => {
    const result = loadEnv({
      ...valid,
      GOOGLE_CLIENT_ID: "id",
      GOOGLE_CLIENT_SECRET: "secret",
    });
    expect(result.GOOGLE_CLIENT_ID).toBe("id");
    expect(result.GOOGLE_CLIENT_SECRET).toBe("secret");
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
