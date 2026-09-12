# SaaS Launchpad Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip Indie Research OS and replace it with a reusable Next.js 16 SaaS starter: Better Auth, Drizzle on Railway Postgres, Stripe subscriptions, x402 demo, Resend, authed dashboard.

**Architecture:** Feature-organized modules under `lib/` (env, db, dal, auth, payments, x402, email) plus App Router route groups `(marketing)` (public) and `(app)` (authed). `proxy.ts` does an optimistic session-cookie check only. `lib/dal` is the authoritative auth/entitlement layer, per Next.js 16 Data Access Layer guidance. One Postgres (`DATABASE_URL`) backs Better Auth, subscriptions, and the rate limiter.

**Tech Stack:** Next.js 16 App Router · Better Auth · Drizzle ORM + postgres.js · Railway Postgres (local Docker for dev/tests) · Stripe · `@x402/next` · Resend · Zod · Tailwind 4 · Vitest · Playwright

**Spec:** `docs/superpowers/specs/2026-08-05-saas-launchpad-design.md`

## Global Constraints

- Next.js 16 App Router; `proxy.ts` (not `middleware.ts`); no DB calls in proxy.
- Better Auth email/password always on; Google only when both Google env vars are set.
- Railway Postgres in production; local/tests use Docker Postgres via the same `DATABASE_URL` shape. No Neon client.
- One monthly Stripe price from `STRIPE_PRICE_ID`; entitlement = `subscription.status` in `active|trialing` and `currentPeriodEnd > now`.
- x402 stays per-route via `withX402()` — never in `proxy.ts`. Demo on Base Sepolia (`eip155:84532`). Unset wallet → 501.
- Zod at every route/action boundary. `lib/env.ts` fails fast. Rate-limit every route/action (fixed window; unauth = IP+route, auth = userId+route).
- Immutable data. No secrets in source. Files < 800 lines. Functions < 50 lines.
- TDD: failing test first, then minimal implementation. Target 80% coverage on `lib/`.
- Do not carry `docs/salvage/` or `POSTMORTEM.md` onto this branch.

---

## File map

**Delete**

- `app/page.tsx` (replaced by `(marketing)/page.tsx`)
- `app/api/research/route.ts`
- `app/api/waitlist/route.ts`
- `app/api/beta/`
- `app/api/checkout/`
- `app/api/confirm-checkout/`
- `app/api/metrics/`
- `data/reports/`
- `data/beta-signups.json` (if present)
- `public/experiment-*.html`
- Uncommitted Indie Research OS docs under `docs/` except `docs/superpowers/`

**Create**

| Path | Responsibility |
|------|----------------|
| `lib/env.ts` | Zod-parsed env; `loadEnv()` / `env()` |
| `lib/config/product.ts` | Rebrandable name/tagline/description |
| `lib/db/schema.ts` | Better Auth tables + `subscription` + `rate_limit` |
| `lib/db/index.ts` | postgres.js + Drizzle client |
| `lib/ratelimit.ts` | Fixed-window limiter + Postgres store |
| `lib/auth/server.ts` | `betterAuth(...)` with Drizzle adapter |
| `lib/auth/client.ts` | `createAuthClient` from `better-auth/react` |
| `lib/dal/user.ts` | `getUser()`, `requireUser()`, `UserDTO` |
| `lib/dal/subscription.ts` | `hasActiveSubscription()`, `requireActiveSubscription()` |
| `lib/payments/stripe.ts` | Stripe SDK client |
| `lib/payments/sync.ts` | Webhook → `subscription` upsert/delete |
| `lib/payments/checkout.ts` | Checkout session + billing portal helpers |
| `lib/x402/server.ts` | Facilitator + resource server |
| `lib/x402/config.ts` | Network map, demo route config, configured? |
| `lib/email/send.ts` | `sendEmail()` Resend wrapper |
| `app/api/auth/[...all]/route.ts` | Better Auth handler |
| `app/api/stripe/webhook/route.ts` | Stripe signature verify + sync |
| `app/api/paid/demo/route.ts` | x402 demo (501 if no wallet) |
| `app/(marketing)/page.tsx` | Landing |
| `app/(marketing)/pricing/page.tsx` | Pricing CTA |
| `app/(marketing)/sign-in/page.tsx` | Sign in |
| `app/(marketing)/sign-up/page.tsx` | Sign up |
| `app/(app)/layout.tsx` | Authed shell; calls `requireUser()` |
| `app/(app)/dashboard/page.tsx` | Dashboard |
| `app/(app)/account/page.tsx` | Account |
| `app/(app)/billing/page.tsx` | Subscribe / portal |
| `app/(app)/actions/billing.ts` | Server actions: checkout, portal |
| `proxy.ts` | Optimistic `getSessionCookie()` |
| `drizzle.config.ts` | Kit config |
| `docker-compose.yml` | Local Postgres 16 |
| `.env.example` | Placeholder keys |
| `vitest.config.mts` | Unit/integration runner |
| `playwright.config.ts` | E2E runner |
| `tests/**` | Unit, integration, e2e |

**Modify**

- `package.json` — name `saas-launchpad`; scripts; deps
- `.gitignore` — un-ignore `.env.example`
- `README.md` — launchpad setup
- `app/layout.tsx` — product metadata
- `app/globals.css` — drop Indie Research OS-only classes

---

### Task 1: Strip old product, env, test runner

**Files:**
- Create: `lib/env.ts`, `lib/config/product.ts`, `.env.example`, `vitest.config.mts`, `tests/unit/env.test.ts`, `tests/unit/product.test.ts`
- Modify: `package.json`, `.gitignore`, `app/layout.tsx`, `app/globals.css`, `README.md`
- Delete: old product files listed above
- Test: `tests/unit/env.test.ts`

**Interfaces:**
- Consumes: `process.env`
- Produces:
  - `loadEnv(source?: NodeJS.ProcessEnv): Env`
  - `env(): Env`
  - `product: { name: string; tagline: string; description: string }`

- [ ] **Step 1: Add test tooling and Zod**

```bash
npm install zod server-only
npm install -D vitest @vitejs/plugin-react jsdom vite-tsconfig-paths @vitest/coverage-v8
```

Add scripts to `package.json`: `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:coverage": "vitest run --coverage"`. Set `"name": "saas-launchpad"`.

`vitest.config.mts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts"],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 80 },
    },
  },
});
```

- [ ] **Step 2: Write the failing env tests**

```ts
// tests/unit/env.test.ts
import { describe, expect, it } from "vitest";
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
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run tests/unit/env.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/env'`

- [ ] **Step 4: Implement `lib/env.ts` and `lib/config/product.ts`**

```ts
// lib/env.ts
import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    STRIPE_PRICE_ID: z.string().startsWith("price_"),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
    EMAIL_FROM: z.email(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    RESOURCE_WALLET_ADDRESS: z.string().optional(),
    NETWORK: z.string().default("base-sepolia"),
    FACILITATOR_URL: z.url().default("https://x402.org/facilitator"),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production" && !data.RESEND_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["RESEND_API_KEY"],
        message: "RESEND_API_KEY is required in production",
      });
    }
    if (data.NODE_ENV === "production" && !data.RESOURCE_WALLET_ADDRESS) {
      ctx.addIssue({
        code: "custom",
        path: ["RESOURCE_WALLET_ADDRESS"],
        message: "RESOURCE_WALLET_ADDRESS is required in production",
      });
    }
    const hasId = Boolean(data.GOOGLE_CLIENT_ID);
    const hasSecret = Boolean(data.GOOGLE_CLIENT_SECRET);
    if (hasId !== hasSecret) {
      ctx.addIssue({
        code: "custom",
        path: ["GOOGLE_CLIENT_ID"],
        message: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must both be set",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${details}`);
  }
  return parsed.data;
}

let cached: Env | undefined;

export function env(): Env {
  if (!cached) {
    cached = loadEnv();
  }
  return cached;
}
```

```ts
// lib/config/product.ts
export const product = {
  name: "Launchpad",
  tagline: "Ship the idea, not the plumbing.",
  description:
    "Auth, subscriptions, and agent payments — ready so the next product starts on the idea.",
} as const;
```

- [ ] **Step 5: Run tests and make sure they pass**

```bash
npx vitest run tests/unit/env.test.ts
```

Expected: PASS

- [ ] **Step 6: Strip old product, fix gitignore, write `.env.example`**

Update `.gitignore` so `.env.example` is committed:

```
.env*
!.env.example
```

`.env.example` (placeholders only):

```
NODE_ENV=development
DATABASE_URL=postgresql://launchpad:launchpad@localhost:5432/launchpad
BETTER_AUTH_SECRET=replace-with-openssl-rand-base64-32
BETTER_AUTH_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_replace_me
STRIPE_WEBHOOK_SECRET=whsec_replace_me
STRIPE_PRICE_ID=price_replace_me
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_replace_me
EMAIL_FROM=hello@example.com
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# RESEND_API_KEY=
# RESOURCE_WALLET_ADDRESS=
NETWORK=base-sepolia
FACILITATOR_URL=https://x402.org/facilitator
```

Delete the old product files. Replace `app/layout.tsx` metadata with `product.name` / `product.description`. Remove `.verified`, `.font-display` from `app/globals.css`. Leave a one-line placeholder `app/page.tsx` only if the marketing route group is not yet created — prefer deleting `app/page.tsx` and adding `app/(marketing)/page.tsx` in Task 4; until then keep a stub page so `next build` still has a root route:

```tsx
export default function StubPage() {
  return <main>Launchpad</main>;
}
```

Rewrite `README.md` as a launchpad: stack, env, `docker compose up -d`, `npm run db:migrate`, `npm run dev`. Do not describe Indie Research OS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: strip Indie Research OS and add env validation"
```

---

### Task 2: Drizzle schema, client, rate limiter

**Files:**
- Create: `lib/db/schema.ts`, `lib/db/index.ts`, `lib/ratelimit.ts`, `drizzle.config.ts`, `docker-compose.yml`, `tests/unit/ratelimit.test.ts`
- Modify: `package.json` (db scripts)
- Test: `tests/unit/ratelimit.test.ts`

**Interfaces:**
- Consumes: `env().DATABASE_URL`
- Produces:
  - `db` Drizzle client
  - tables: `user`, `session`, `account`, `verification`, `subscription`, `rateLimit`
  - `checkRateLimit({ key, limit, windowMs, now, store }): Promise<RateLimitResult>`
  - `createPostgresRateLimitStore(db): RateLimitStore`

- [ ] **Step 1: Write the failing rate-limiter tests**

```ts
// tests/unit/ratelimit.test.ts
import { describe, expect, it } from "vitest";
import { checkRateLimit, type RateLimitStore } from "@/lib/ratelimit";

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
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/unit/ratelimit.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/ratelimit'`

- [ ] **Step 3: Install Drizzle + Postgres driver and implement schema, client, limiter**

```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

`docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: launchpad
      POSTGRES_PASSWORD: launchpad
      POSTGRES_DB: launchpad
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

`drizzle.config.ts` reads `DATABASE_URL` from env; `dialect: "postgresql"`, `schema: "./lib/db/schema.ts"`, `out: "./drizzle"`.

`lib/db/schema.ts` — Better Auth tables use singular names matching the spec. Generate the auth four with `npx @better-auth/cli generate` against `lib/auth/server.ts` once Task 3 stubs auth, **or** hand-write them now as:

- `user(id, name, email, emailVerified, image, createdAt, updatedAt)`
- `session(id, expiresAt, token, createdAt, updatedAt, ipAddress, userAgent, userId → user.id cascade)`
- `account(id, accountId, providerId, userId → user.id cascade, accessToken, refreshToken, idToken, accessTokenExpiresAt, refreshTokenExpiresAt, scope, password, createdAt, updatedAt)`
- `verification(id, identifier, value, expiresAt, createdAt, updatedAt)`

App tables:

```ts
export const subscription = pgTable("subscription", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  status: text("status").notNull(),
  priceId: text("price_id").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
});

export const rateLimit = pgTable("rate_limit", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: timestamp("window_start").notNull(),
});
```

`lib/db/index.ts`:

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "@/lib/db/schema";

const client = postgres(env().DATABASE_URL);
export const db = drizzle({ client, schema });
```

`lib/ratelimit.ts` types and `checkRateLimit` as in the tests (new object each return; never mutate the stored row in place). `createPostgresRateLimitStore(database)` reads/writes `rate_limit`.

`rateLimitKey(input: { userId?: string; ip: string; route: string }): string` → `user:${userId}:${route}` or `ip:${ip}:${route}`.

`enforceRateLimit({ userId, ip, route, limit, windowMs, store })` composes key + `checkRateLimit`. Default `limit = 60`, `windowMs = 60_000`. Every later API route and server action calls this and returns 429 `{ error: "Too many requests" }` when `allowed === false`.

Package scripts: `"db:generate": "drizzle-kit generate"`, `"db:migrate": "drizzle-kit migrate"`.

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/unit/ratelimit.test.ts
```

Expected: PASS

- [ ] **Step 5: Generate and apply migrations against local Docker Postgres**

```bash
docker compose up -d
npx drizzle-kit generate
npx drizzle-kit migrate
```

Expected: tables exist. Do not commit secrets. Do commit generated SQL under `drizzle/`.

- [ ] **Step 6: Commit**

```bash
git add lib/db lib/ratelimit.ts drizzle.config.ts docker-compose.yml drizzle package.json package-lock.json tests/unit/ratelimit.test.ts
git commit -m "feat: add Drizzle schema, Postgres client, and rate limiter"
```

---

### Task 3: Better Auth, proxy, DAL

**Files:**
- Create: `lib/auth/server.ts`, `lib/auth/client.ts`, `lib/dal/user.ts`, `app/api/auth/[...all]/route.ts`, `proxy.ts`, `tests/unit/dal.test.ts`
- Test: `tests/unit/dal.test.ts`

**Interfaces:**
- Consumes: `db`, `env()`, schema `user`/`session`/`account`/`verification`
- Produces:
  - `auth` Better Auth instance
  - `authClient` from `better-auth/react`
  - `UserDTO = { id: string; email: string; name: string; image: string | null; emailVerified: boolean }`
  - `getUser(): Promise<UserDTO | null>` (React `cache()`)
  - `requireUser(): Promise<UserDTO>` (redirects to `/sign-in`)
  - `toUserDTO(user): UserDTO` — never pass the full Better Auth user object to Client Components

- [ ] **Step 1: Write the failing DAL tests**

Inject session lookup so tests do not boot Next or Postgres:

```ts
// tests/unit/dal.test.ts
import { describe, expect, it, vi } from "vitest";
import { toUserDTO, createRequireUser } from "@/lib/dal/user";

describe("toUserDTO", () => {
  it("returns only public fields", () => {
    const dto = toUserDTO({
      id: "u1",
      email: "a@b.com",
      name: "A",
      image: null,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(dto).toEqual({
      id: "u1",
      email: "a@b.com",
      name: "A",
      image: null,
      emailVerified: true,
    });
    expect(dto).not.toHaveProperty("createdAt");
  });
});

describe("requireUser", () => {
  it("returns the user when a session exists", async () => {
    const requireUser = createRequireUser(async () => ({
      id: "u1",
      email: "a@b.com",
      name: "A",
      image: null,
      emailVerified: true,
    }));
    await expect(requireUser()).resolves.toMatchObject({ id: "u1" });
  });

  it("redirects to /sign-in when there is no session", async () => {
    const redirect = vi.fn(() => {
      throw new Error("NEXT_REDIRECT");
    });
    const requireUser = createRequireUser(async () => null, redirect);
    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/sign-in");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/unit/dal.test.ts
```

Expected: FAIL — missing module

- [ ] **Step 3: Implement auth + DAL + proxy + route handler**

```bash
npm install better-auth
```

`lib/auth/server.ts`:

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { env } from "@/lib/env";

const googleId = env().GOOGLE_CLIENT_ID;
const googleSecret = env().GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  secret: env().BETTER_AUTH_SECRET,
  baseURL: env().BETTER_AUTH_URL,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true },
  socialProviders:
    googleId && googleSecret
      ? { google: { clientId: googleId, clientSecret: googleSecret } }
      : undefined,
  plugins: [nextCookies()],
});
```

`lib/auth/client.ts`:

```ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
```

`app/api/auth/[...all]/route.ts`:

```ts
import { auth } from "@/lib/auth/server";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

Wrap GET/POST with rate limiting using IP + `/api/auth`.

`lib/dal/user.ts` — `'server-only'`. `getUser` uses `cache(async () => { const session = await auth.api.getSession({ headers: await headers() }); return session ? toUserDTO(session.user) : null; })`. `createRequireUser(getUserImpl, redirectImpl = redirect)` is the testable core; `requireUser` is `createRequireUser(getUser)`.

`proxy.ts` — **cookie only**, no `auth.api.getSession`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const authedPrefixes = ["/dashboard", "/account", "/billing"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthedRoute = authedPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const sessionCookie = getSessionCookie(request);

  if (isAuthedRoute && !sessionCookie) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  if (sessionCookie && (pathname === "/sign-in" || pathname === "/sign-up")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/account/:path*", "/billing/:path*", "/sign-in", "/sign-up"],
};
```

If `npx @better-auth/cli generate` produces a schema that differs from `lib/db/schema.ts`, merge it (keep singular table names) and regenerate the migration.

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/unit/dal.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add Better Auth, proxy cookie check, and DAL"
```

---

### Task 4: Marketing landing + authed shell

**Files:**
- Create: `app/(marketing)/layout.tsx`, `app/(marketing)/page.tsx`, `app/(marketing)/pricing/page.tsx`, `app/(marketing)/sign-in/page.tsx`, `app/(marketing)/sign-up/page.tsx`, `app/(app)/layout.tsx`, `app/(app)/dashboard/page.tsx`, `app/(app)/account/page.tsx`, `app/(app)/billing/page.tsx` (billing page can be a “coming soon / subscribe” stub until Task 5), `components/auth/sign-in-form.tsx`, `components/auth/sign-up-form.tsx`, `components/ui/button.tsx`, `components/ui/input.tsx`
- Delete: stub `app/page.tsx`
- Test: `tests/unit/product.test.ts` (name/tagline present on config); e2e landing smoke lands in Task 8

**Interfaces:**
- Consumes: `product`, `authClient`, `requireUser()`
- Produces: public URLs `/`, `/pricing`, `/sign-in`, `/sign-up`; authed URLs `/dashboard`, `/account`, `/billing`

- [ ] **Step 1: Write a failing product-config test used by the landing**

```ts
// tests/unit/product.test.ts
import { describe, expect, it } from "vitest";
import { product } from "@/lib/config/product";

describe("product", () => {
  it("exposes a rebrandable name and tagline", () => {
    expect(product.name.length).toBeGreaterThan(0);
    expect(product.tagline.length).toBeGreaterThan(0);
    expect(product.name).not.toMatch(/Indie Research/i);
  });
});
```

- [ ] **Step 2: Run it**

```bash
npx vitest run tests/unit/product.test.ts
```

Expected: PASS if Task 1 created `product.ts`; otherwise implement it here.

- [ ] **Step 3: Implement pages**

Sign-up form (client): Zod-validated on the client for UX, then `authClient.signUp.email({ email, password, name, callbackURL: "/dashboard" })`. Sign-in: `authClient.signIn.email({ email, password, callbackURL: "/dashboard" })`. If `env` has Google (pass a `NEXT_PUBLIC_GOOGLE_ENABLED=true` only when both server Google vars are set — or simply hide the Google button unless `authClient` social is configured; safest: render Google button when `process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true"`, set that in `.env.example` as optional).

`(app)/layout.tsx` is an async Server Component: `const user = await requireUser();` then render nav (Dashboard, Account, Billing, Sign out) + `{children}`. Sign out is a client button calling `authClient.signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/"; } } })`.

Landing: `product.name`, `product.tagline`, CTA to `/sign-up`, secondary to `/pricing`. No Indie Research OS copy, no research form, no metrics bar.

Pricing: one monthly plan, CTA to `/sign-up` (checkout is Task 5).

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add marketing landing and authed dashboard shell"
```

---

### Task 5: Stripe subscriptions, portal, webhook, entitlement

**Files:**
- Create: `lib/payments/stripe.ts`, `lib/payments/sync.ts`, `lib/payments/checkout.ts`, `lib/dal/subscription.ts`, `app/api/stripe/webhook/route.ts`, `app/(app)/actions/billing.ts`, `tests/unit/entitlement.test.ts`, `tests/unit/payments-sync.test.ts`, `tests/integration/stripe-webhook.test.ts`
- Modify: `app/(app)/billing/page.tsx`
- Test: unit entitlement + sync; integration webhook

**Interfaces:**
- Consumes: `db`, `subscription` table, `env().STRIPE_*`, `requireUser()`
- Produces:
  - `isEntitlingStatus(status: string, currentPeriodEnd: Date, now: Date): boolean`
  - `hasActiveSubscription(userId: string, now?: Date): Promise<boolean>`
  - `requireActiveSubscription(): Promise<UserDTO>`
  - `upsertSubscriptionFromStripe(row: SubscriptionWrite): Promise<void>`
  - `markSubscriptionCanceled(stripeSubscriptionId: string, currentPeriodEnd: Date): Promise<void>`
  - `createCheckoutUrl(user: UserDTO): Promise<string>`
  - `createPortalUrl(user: UserDTO): Promise<string>`
  - Server actions `startCheckout()` / `openPortal()` returning `{ url }` or `{ error }`

- [ ] **Step 1: Write failing entitlement + sync tests**

```ts
// tests/unit/entitlement.test.ts
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

```

```ts
// tests/unit/dal-subscription.test.ts
import { describe, expect, it } from "vitest";
import { createHasActiveSubscription } from "@/lib/dal/subscription";

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
});
```

```ts
// tests/unit/payments-sync.test.ts
import { describe, expect, it } from "vitest";
import { subscriptionWriteFromCheckout, subscriptionWriteFromUpdated } from "@/lib/payments/sync";

describe("subscriptionWriteFromCheckout", () => {
  it("maps checkout.session.completed metadata to a write", () => {
    const row = subscriptionWriteFromCheckout({
      userId: "u1",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
      status: "active",
      priceId: "price_test",
      currentPeriodEndUnix: 1_800_000_000,
    });
    expect(row.userId).toBe("u1");
    expect(row.stripeSubscriptionId).toBe("sub_1");
    expect(row.currentPeriodEnd).toEqual(new Date(1_800_000_000 * 1000));
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run tests/unit/entitlement.test.ts tests/unit/payments-sync.test.ts
```

- [ ] **Step 3: Implement payments**

`lib/payments/stripe.ts` — `new Stripe(env().STRIPE_SECRET_KEY)`.

`lib/payments/sync.ts` — pure mappers + `isEntitlingStatus`. `upsertSubscriptionFromStripe` inserts or updates by `stripeSubscriptionId` (new object / Drizzle `onConflictDoUpdate`). Never mutate the incoming row.

`lib/payments/checkout.ts` — `checkout.sessions.create({ mode: "subscription", line_items: [{ price: env().STRIPE_PRICE_ID, quantity: 1 }], success_url: "${base}/billing?success=1", cancel_url: "${base}/billing?canceled=1", customer_email: user.email, client_reference_id: user.id, metadata: { userId: user.id }, subscription_data: { metadata: { userId: user.id } } })`. Portal: look up `stripeCustomerId` from `subscription` for that user; if missing, return a user-facing error.

Webhook route: read raw body, `stripe.webhooks.constructEvent(raw, signature, env().STRIPE_WEBHOOK_SECRET)`. Handle `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Unknown events: 200. Bad signature: 400. Rate-limit by IP + `/api/stripe/webhook`.

`lib/dal/subscription.ts` — `createHasActiveSubscription(loadRow)` is the testable core; `hasActiveSubscription` loads the user's `subscription` row and applies `isEntitlingStatus`. `requireActiveSubscription` calls `requireUser()` then redirects to `/billing` when not entitled. Billing server actions call `enforceRateLimit` with `userId` + `/billing`.

Billing page: if entitled, “Manage billing” button (`openPortal`). If not, “Subscribe” (`startCheckout`). Server actions validate nothing beyond auth (no client-supplied price ids).

Integration test `tests/integration/stripe-webhook.test.ts`: call the handler with a mocked `constructEvent` (inject via optional param `verifySignature` on a `createWebhookHandler({ verify, sync })` factory). Assert `upsert` is invoked with the mapped row. Do not hit live Stripe.

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run tests/unit/entitlement.test.ts tests/unit/payments-sync.test.ts tests/integration/stripe-webhook.test.ts
```

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add Stripe checkout, portal, webhook sync, and entitlement"
```

---

### Task 6: x402 wrapper + testnet demo route

**Files:**
- Create: `lib/x402/server.ts`, `lib/x402/config.ts`, `app/api/paid/demo/route.ts`, `tests/unit/x402-config.test.ts`, `tests/integration/x402-demo.test.ts`

**Interfaces:**
- Consumes: `env().RESOURCE_WALLET_ADDRESS`, `NETWORK`, `FACILITATOR_URL`
- Produces:
  - `isX402Configured(wallet: string | undefined): boolean`
  - `networkToCaip(network: string): string` — `"base-sepolia"` → `"eip155:84532"`
  - `demoPaymentAccepts(wallet: string, network: string)`
  - `GET /api/paid/demo` — 501 `{ error: "x402 is not configured" }` if no wallet; otherwise `withX402(handler, config, server)`

- [ ] **Step 1: Write failing config tests**

```ts
// tests/unit/x402-config.test.ts
import { describe, expect, it } from "vitest";
import { isX402Configured, networkToCaip } from "@/lib/x402/config";

describe("isX402Configured", () => {
  it("is false when wallet is missing or empty", () => {
    expect(isX402Configured(undefined)).toBe(false);
    expect(isX402Configured("")).toBe(false);
  });

  it("is true when a wallet is set", () => {
    expect(isX402Configured("0xabc")).toBe(true);
  });
});

describe("networkToCaip", () => {
  it("maps base-sepolia to eip155:84532", () => {
    expect(networkToCaip("base-sepolia")).toBe("eip155:84532");
  });

  it("maps base to eip155:8453", () => {
    expect(networkToCaip("base")).toBe("eip155:8453");
  });

  it("throws on an unknown network", () => {
    expect(() => networkToCaip("ethereum")).toThrow(/unknown network/i);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run tests/unit/x402-config.test.ts
```

- [ ] **Step 3: Implement**

```bash
npm install @x402/next @x402/core @x402/evm
```

`lib/x402/config.ts` as tested. `lib/x402/server.ts` builds `HTTPFacilitatorClient` + `x402ResourceServer` + `registerExactEvmScheme(server)` using `env().FACILITATOR_URL`.

Demo route: if `!isX402Configured(env().RESOURCE_WALLET_ADDRESS)` return `NextResponse.json({ error: "x402 is not configured" }, { status: 501 })`. Else wrap a handler that returns `{ ok: true, message: "paid demo" }` with:

```ts
withX402(handler, {
  accepts: [{
    scheme: "exact",
    price: "$0.001",
    network: networkToCaip(env().NETWORK),
    payTo: env().RESOURCE_WALLET_ADDRESS,
  }],
  description: "Launchpad x402 demo",
  mimeType: "application/json",
}, server)
```

Integration test: call the unconfigured handler path and expect 501. For the configured path, mock the resource server so a request without payment headers returns 402 (or skip live facilitator; do not send real USDC).

Rate-limit the demo route by IP + `/api/paid/demo`.

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run tests/unit/x402-config.test.ts tests/integration/x402-demo.test.ts
```

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add x402 withX402 wrapper and Base Sepolia demo route"
```

---

### Task 7: Resend email (verification + receipt)

**Files:**
- Create: `lib/email/send.ts`, `lib/email/verification.ts`, `lib/email/receipt.ts`, `tests/unit/email.test.ts`
- Modify: `lib/auth/server.ts` (`emailVerification.sendVerificationEmail`), `lib/payments/sync.ts` or webhook handler (receipt after `checkout.session.completed`)

**Interfaces:**
- Consumes: `env().RESEND_API_KEY`, `EMAIL_FROM`
- Produces:
  - `sendEmail({ to, subject, html }): Promise<SendEmailResult>`
  - `SendEmailResult = { id: string } | { skipped: true; reason: "no-api-key" }`
  - `sendVerificationEmail({ to, url }): Promise<SendEmailResult>`
  - `sendCheckoutReceipt({ to, priceId }): Promise<SendEmailResult>`

- [ ] **Step 1: Write failing email tests**

```ts
// tests/unit/email.test.ts
import { describe, expect, it, vi } from "vitest";
import { sendEmail } from "@/lib/email/send";

describe("sendEmail", () => {
  it("skips when apiKey is missing in development", async () => {
    const send = vi.fn();
    const result = await sendEmail(
      { to: "a@b.com", subject: "Hi", html: "<p>Hi</p>" },
      { apiKey: undefined, from: "hello@example.com", nodeEnv: "development", send },
    );
    expect(result).toEqual({ skipped: true, reason: "no-api-key" });
    expect(send).not.toHaveBeenCalled();
  });

  it("throws when apiKey is missing in production", async () => {
    await expect(
      sendEmail(
        { to: "a@b.com", subject: "Hi", html: "<p>Hi</p>" },
        { apiKey: undefined, from: "hello@example.com", nodeEnv: "production", send: vi.fn() },
      ),
    ).rejects.toThrow(/RESEND_API_KEY/);
  });

  it("sends through the transport when an api key is present", async () => {
    const send = vi.fn(async () => ({ id: "msg_1" }));
    const result = await sendEmail(
      { to: "a@b.com", subject: "Hi", html: "<p>Hi</p>" },
      { apiKey: "re_test", from: "hello@example.com", nodeEnv: "development", send },
    );
    expect(result).toEqual({ id: "msg_1" });
    expect(send).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run tests/unit/email.test.ts
```

- [ ] **Step 3: Implement**

```bash
npm install resend
```

`sendEmail` uses injected `send` in tests; default transport is `new Resend(apiKey).emails.send({ from, to, subject, html })`. Log the skipped send in development (`console.info` is fine; no `console.log` debug dumps of the html body).

Wire Better Auth:

```ts
emailVerification: {
  sendOnSignUp: true,
  sendVerificationEmail: async ({ user, url }) => {
    await sendVerificationEmail({ to: user.email, url });
  },
},
```

After a successful checkout sync, call `sendCheckoutReceipt` (do not fail the webhook if email skips/fails — log the error, still return 200 after the subscription write succeeds; the subscription write is the source of truth).

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run tests/unit/email.test.ts
```

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add Resend verification and checkout receipt emails"
```

---

### Task 8: E2E critical path, 80% coverage, Railway docs

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/critical-path.spec.ts`, `tests/e2e/landing.spec.ts`
- Modify: `package.json`, `README.md`
- Test: Playwright + `npm run test:coverage`

**Interfaces:**
- Consumes: running Next app + Docker Postgres + env from `.env.example` filled with test keys
- Produces: e2e covering sign up → dashboard; subscribe step uses Stripe test mode **or** a seeded `subscription` row if Stripe is unavailable in CI

- [ ] **Step 1: Write the failing e2e landing test**

```ts
// tests/e2e/landing.spec.ts
import { expect, test } from "@playwright/test";

test("landing shows product name and sign-up CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /sign up/i })).toBeVisible();
});
```

```ts
// tests/e2e/critical-path.spec.ts
import { expect, test } from "@playwright/test";

test("sign up lands on the dashboard", async ({ page }) => {
  const email = `user-${Date.now()}@example.com`;
  await page.goto("/sign-up");
  await page.getByLabel(/name/i).fill("Test User");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill("Passw0rd!");
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText(/dashboard/i)).toBeVisible();
});
```

Gated-content e2e: after signup, `/billing` shows Subscribe. Optional second test seeds an active subscription via Drizzle in a setup hook and asserts a small “Pro” badge on `/dashboard` that `requireActiveSubscription` / `hasActiveSubscription` would gate — only if a gated snippet is added to the dashboard (a single “Paid feature” card is enough; do not invent a product).

- [ ] **Step 2: Run e2e — expect FAIL (Playwright not installed)**

```bash
npx playwright test
```

- [ ] **Step 3: Install Playwright and config**

```bash
npm init playwright@latest
```

Use Next.js docs: `webServer.command = "npm run dev"`, `url = "http://localhost:3000"`. Scripts: `"test:e2e": "playwright test"`. README: Railway add Postgres plugin, set env vars from `.env.example`, start command `npx drizzle-kit migrate && npm run start`. Document Stripe CLI for local webhooks: `stripe listen --forward-to localhost:3000/api/stripe/webhook`. Document x402 mainnet flip: `NETWORK=base`, real `RESOURCE_WALLET_ADDRESS`.

- [ ] **Step 4: Run unit+integration coverage and e2e**

```bash
npm run test:coverage
npm run test:e2e
npm run lint
npx tsc --noEmit
```

Expected: coverage thresholds met on `lib/`; e2e green against local Docker Postgres; lint/typecheck clean.

- [ ] **Step 5: Commit**

```bash
git commit -m "test: add e2e critical path and document Railway deploy"
```

---

## Self-review

**Spec coverage**

| Spec section | Task |
|---|---|
| Strip old product, env, `.env.example` | 1 |
| Railway Postgres, Drizzle schema, rate limiter | 2 |
| Better Auth, `proxy.ts` cookie check, DAL | 3 |
| Marketing + authed shell | 4 |
| Stripe checkout/portal/webhook/entitlement | 5 |
| x402 `withX402` + 501 when unset | 6 |
| Resend verification + receipt | 7 |
| 80% tests, e2e, Railway | 8 |
| Out of scope (no orgs/admin/analytics/x402 credits) | none added |
| Salvage/post-mortem stay off this branch | Task 1 delete list |

**Placeholders:** none.

**Type consistency:** `UserDTO`, `RateLimitStore` / `RateLimitResult`, `loadEnv` / `env`, `isEntitlingStatus`, `sendEmail` / `SendEmailResult` are defined in the task that produces them and reused later by name.

**Independence:** Task 6 does not depend on Task 5. Task 7 depends on 3 (verification) and 5 (receipt). Tasks 1→4 are sequential.

**Local DB:** `docker compose up -d` then `DATABASE_URL=postgresql://launchpad:launchpad@localhost:5432/launchpad`. Production is Railway Postgres via the same variable.
