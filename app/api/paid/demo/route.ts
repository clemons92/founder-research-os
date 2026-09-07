import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import type { x402ResourceServer } from "@x402/core/server";
import { env } from "@/lib/env";
import {
  enforceRateLimit,
  type RateLimitStore,
} from "@/lib/ratelimit";
import { demoPaymentAccepts, isX402Configured } from "@/lib/x402/config";
import { getX402Server } from "@/lib/x402/server";

const DEMO_ROUTE = "/api/paid/demo";

export type PaidDemoDeps = {
  getWallet?: () => string | undefined;
  getNetwork?: () => string;
  store?: RateLimitStore;
  getServer?: () => x402ResourceServer;
};

async function loadPostgresStore(): Promise<RateLimitStore> {
  const { db } = await import("@/lib/db");
  const { createPostgresRateLimitStore } = await import("@/lib/ratelimit");
  return createPostgresRateLimitStore(db);
}

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first && first.length > 0 ? first : "127.0.0.1";
}

export function createPaidDemoGet(deps: PaidDemoDeps = {}) {
  return async function GET(request: NextRequest): Promise<NextResponse> {
    const store = deps.store ?? (await loadPostgresStore());
    const limited = await enforceRateLimit({
      ip: clientIp(request),
      route: DEMO_ROUTE,
      store,
    });
    if (!limited.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const wallet = deps.getWallet ? deps.getWallet() : env().RESOURCE_WALLET_ADDRESS;
    if (!isX402Configured(wallet) || !wallet) {
      return NextResponse.json(
        { error: "x402 is not configured" },
        { status: 501 },
      );
    }

    const network = deps.getNetwork ? deps.getNetwork() : env().NETWORK;
    const handler = async () =>
      NextResponse.json({ ok: true, message: "paid demo" });

    const gated = withX402(
      handler,
      {
        accepts: demoPaymentAccepts(wallet, network),
        description: "Launchpad x402 demo",
        mimeType: "application/json",
      },
      deps.getServer ? deps.getServer() : getX402Server(),
    );

    return gated(request);
  };
}

export const GET = createPaidDemoGet();
