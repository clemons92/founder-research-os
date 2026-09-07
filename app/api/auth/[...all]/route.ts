import { NextRequest, NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { createPostgresRateLimitStore, enforceRateLimit } from "@/lib/ratelimit";

const handlers = toNextJsHandler(auth);
const AUTH_ROUTE = "/api/auth";

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first && first.length > 0 ? first : "127.0.0.1";
}

async function rateLimit(request: NextRequest): Promise<NextResponse | null> {
  const result = await enforceRateLimit({
    ip: clientIp(request),
    route: AUTH_ROUTE,
    store: createPostgresRateLimitStore(db),
  });
  if (!result.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  return null;
}

export async function GET(request: NextRequest): Promise<Response> {
  return (await rateLimit(request)) ?? handlers.GET(request);
}

export async function POST(request: NextRequest): Promise<Response> {
  return (await rateLimit(request)) ?? handlers.POST(request);
}
