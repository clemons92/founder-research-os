import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";
import type { RateLimitStore } from "@/lib/ratelimit";

vi.mock("@x402/next", () => ({
  withX402: (
    handler: (request: NextRequest) => Promise<Response>,
  ) => {
    return async (request: NextRequest) => {
      const payment =
        request.headers.get("payment-signature") ??
        request.headers.get("x-payment");
      if (!payment) {
        return NextResponse.json({ error: "Payment Required" }, { status: 402 });
      }
      return handler(request);
    };
  },
}));

function memoryStore(): RateLimitStore {
  const rows = new Map<string, { count: number; windowStart: Date }>();
  return {
    async get(key) {
      const row = rows.get(key);
      return row ? { ...row } : null;
    },
    async set(key, count, windowStart) {
      rows.set(key, { count, windowStart: new Date(windowStart) });
    },
  };
}

function request(path = "http://localhost:3000/api/paid/demo", headers?: HeadersInit) {
  return new NextRequest(path, { method: "GET", headers });
}

describe("GET /api/paid/demo", () => {
  it("returns 501 when the wallet is not configured", async () => {
    const { createPaidDemoGet } = await import("@/app/api/paid/demo/route");
    const GET = createPaidDemoGet({
      getWallet: () => undefined,
      getNetwork: () => "base-sepolia",
      store: memoryStore(),
      getServer: () => ({}) as never,
    });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(501);
    expect(body).toEqual({ error: "x402 is not configured" });
  });

  it("returns 402 when configured but no payment is presented", async () => {
    const { createPaidDemoGet } = await import("@/app/api/paid/demo/route");
    const GET = createPaidDemoGet({
      getWallet: () => "0xabc",
      getNetwork: () => "base-sepolia",
      store: memoryStore(),
      getServer: () => ({}) as never,
    });

    const response = await GET(request());

    expect(response.status).toBe(402);
  });

  it("returns the paid demo payload after a mocked payment", async () => {
    const { createPaidDemoGet } = await import("@/app/api/paid/demo/route");
    const GET = createPaidDemoGet({
      getWallet: () => "0xabc",
      getNetwork: () => "base-sepolia",
      store: memoryStore(),
      getServer: () => ({}) as never,
    });

    const response = await GET(
      request("http://localhost:3000/api/paid/demo", {
        "x-payment": "mock",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, message: "paid demo" });
  });
});
