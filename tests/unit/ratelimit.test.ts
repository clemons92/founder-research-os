import { describe, expect, it } from "vitest";
import {
  checkRateLimit,
  createPostgresRateLimitStore,
  enforceRateLimit,
  rateLimitKey,
  type RateLimitStore,
} from "@/lib/ratelimit";

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

describe("checkRateLimit", () => {
  const windowMs = 60_000;

  it("allows the first request and decrements remaining", async () => {
    const result = await checkRateLimit({
      key: "ip:1:/api/x",
      limit: 2,
      windowMs,
      now: new Date("2026-08-21T00:00:00Z"),
      store: memoryStore(),
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it("blocks when the window is exhausted", async () => {
    const store = memoryStore();
    const now = new Date("2026-08-21T00:00:00Z");
    await checkRateLimit({ key: "k", limit: 1, windowMs, now, store });
    const blocked = await checkRateLimit({
      key: "k",
      limit: 1,
      windowMs,
      now,
      store,
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets after the window elapses", async () => {
    const store = memoryStore();
    await checkRateLimit({
      key: "k",
      limit: 1,
      windowMs,
      now: new Date("2026-08-21T00:00:00Z"),
      store,
    });
    const next = await checkRateLimit({
      key: "k",
      limit: 1,
      windowMs,
      now: new Date("2026-08-21T00:01:01Z"),
      store,
    });
    expect(next.allowed).toBe(true);
    expect(next.remaining).toBe(0);
  });

  it("does not mutate the stored row in place", async () => {
    const store = memoryStore();
    const now = new Date("2026-08-21T00:00:00Z");
    await checkRateLimit({ key: "k", limit: 3, windowMs, now, store });
    const snapshot = await store.get("k");
    await checkRateLimit({ key: "k", limit: 3, windowMs, now, store });
    expect(snapshot).toEqual({ count: 1, windowStart: now });
  });
});

describe("rateLimitKey", () => {
  it("prefers a user key when userId is present", () => {
    expect(
      rateLimitKey({ userId: "u1", ip: "1.1.1.1", route: "/api/x" }),
    ).toBe("user:u1:/api/x");
  });

  it("falls back to ip and route when unauthenticated", () => {
    expect(rateLimitKey({ ip: "1.1.1.1", route: "/api/x" })).toBe(
      "ip:1.1.1.1:/api/x",
    );
  });
});

describe("enforceRateLimit", () => {
  it("composes the key and applies default limit and window", async () => {
    const store = memoryStore();
    const now = new Date("2026-08-21T00:00:00Z");
    const first = await enforceRateLimit({
      ip: "9.9.9.9",
      route: "/api/x",
      now,
      store,
    });
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(59);

    const row = await store.get("ip:9.9.9.9:/api/x");
    expect(row?.count).toBe(1);
  });

  it("uses a user key when userId is provided", async () => {
    const store = memoryStore();
    await enforceRateLimit({
      userId: "u1",
      ip: "9.9.9.9",
      route: "/billing",
      limit: 2,
      windowMs: 60_000,
      now: new Date("2026-08-21T00:00:00Z"),
      store,
    });
    expect(await store.get("user:u1:/billing")).not.toBeNull();
    expect(await store.get("ip:9.9.9.9:/billing")).toBeNull();
  });

  it("uses the current time when now is omitted", async () => {
    const store = memoryStore();
    const result = await enforceRateLimit({
      ip: "2.2.2.2",
      route: "/api/y",
      limit: 1,
      windowMs: 60_000,
      store,
    });
    expect(result.allowed).toBe(true);
    const row = await store.get("ip:2.2.2.2:/api/y");
    expect(row?.windowStart.getTime()).toBeGreaterThan(0);
  });
});

describe("createPostgresRateLimitStore", () => {
  const windowStart = new Date("2026-08-21T00:00:00Z");

  function fakeDatabase(rows: Array<{ count: number; windowStart: Date }>) {
    const writes: Array<{
      key: string;
      count: number;
      windowStart: Date;
    }> = [];
    const database = {
      select() {
        return {
          from() {
            return {
              where() {
                return {
                  limit: async () => rows.map((row) => ({ ...row })),
                };
              },
            };
          },
        };
      },
      insert() {
        return {
          values(value: { key: string; count: number; windowStart: Date }) {
            return {
              onConflictDoUpdate: async () => {
                writes.push({
                  key: value.key,
                  count: value.count,
                  windowStart: new Date(value.windowStart),
                });
              },
            };
          },
        };
      },
    };
    return { database, writes };
  }

  it("returns null when no row exists", async () => {
    const { database } = fakeDatabase([]);
    const store = createPostgresRateLimitStore(database as never);
    expect(await store.get("missing")).toBeNull();
  });

  it("maps a row into a new record object", async () => {
    const { database } = fakeDatabase([{ count: 4, windowStart }]);
    const store = createPostgresRateLimitStore(database as never);
    const row = await store.get("k");
    expect(row).toEqual({ count: 4, windowStart });
    expect(row?.windowStart).not.toBe(windowStart);
  });

  it("upserts count and windowStart", async () => {
    const { database, writes } = fakeDatabase([]);
    const store = createPostgresRateLimitStore(database as never);
    await store.set("k", 2, windowStart);
    expect(writes).toEqual([{ key: "k", count: 2, windowStart }]);
  });
});
