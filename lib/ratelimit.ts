import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/lib/db/schema";
import { rateLimit } from "@/lib/db/schema";

export type RateLimitRecord = {
  count: number;
  windowStart: Date;
};

export type RateLimitStore = {
  get(key: string): Promise<RateLimitRecord | null>;
  set(key: string, count: number, windowStart: Date): Promise<void>;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
};

export type CheckRateLimitInput = {
  key: string;
  limit: number;
  windowMs: number;
  now: Date;
  store: RateLimitStore;
};

const DEFAULT_LIMIT = 60;
const DEFAULT_WINDOW_MS = 60_000;

function remainingAfter(count: number, limit: number): number {
  return Math.max(0, limit - count);
}

function windowElapsed(
  windowStart: Date,
  now: Date,
  windowMs: number,
): boolean {
  return now.getTime() - windowStart.getTime() >= windowMs;
}

export async function checkRateLimit(
  input: CheckRateLimitInput,
): Promise<RateLimitResult> {
  const existing = await input.store.get(input.key);
  const shouldReset =
    existing === null || windowElapsed(existing.windowStart, input.now, input.windowMs);

  if (shouldReset) {
    await input.store.set(input.key, 1, input.now);
    return { allowed: true, remaining: remainingAfter(1, input.limit) };
  }

  if (existing.count >= input.limit) {
    return { allowed: false, remaining: 0 };
  }

  const nextCount = existing.count + 1;
  await input.store.set(input.key, nextCount, existing.windowStart);
  return { allowed: true, remaining: remainingAfter(nextCount, input.limit) };
}

export function rateLimitKey(input: {
  userId?: string;
  ip: string;
  route: string;
}): string {
  if (input.userId) {
    return `user:${input.userId}:${input.route}`;
  }
  return `ip:${input.ip}:${input.route}`;
}

export async function enforceRateLimit(input: {
  userId?: string;
  ip: string;
  route: string;
  limit?: number;
  windowMs?: number;
  now?: Date;
  store: RateLimitStore;
}): Promise<RateLimitResult> {
  return checkRateLimit({
    key: rateLimitKey({
      userId: input.userId,
      ip: input.ip,
      route: input.route,
    }),
    limit: input.limit ?? DEFAULT_LIMIT,
    windowMs: input.windowMs ?? DEFAULT_WINDOW_MS,
    now: input.now ?? new Date(),
    store: input.store,
  });
}

export function createPostgresRateLimitStore(
  database: Pick<PostgresJsDatabase<typeof schema>, "select" | "insert">,
): RateLimitStore {
  return {
    async get(key) {
      const rows = await database
        .select({
          count: rateLimit.count,
          windowStart: rateLimit.windowStart,
        })
        .from(rateLimit)
        .where(eq(rateLimit.key, key))
        .limit(1);
      const row = rows[0];
      if (!row) {
        return null;
      }
      return {
        count: row.count,
        windowStart: new Date(row.windowStart),
      };
    },
    async set(key, count, windowStart) {
      await database
        .insert(rateLimit)
        .values({ key, count, windowStart })
        .onConflictDoUpdate({
          target: rateLimit.key,
          set: { count, windowStart },
        });
    },
  };
}
