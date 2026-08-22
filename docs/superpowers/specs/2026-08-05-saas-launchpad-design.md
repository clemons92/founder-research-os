# Design: Reusable SaaS Launchpad

**Date:** 2026-08-05
**Status:** Approved — Railway Postgres locked 2026-08-21
**Branch:** `launchpad/saas-starter` (off `main`)
**Supersedes:** Indie Research OS (wound down $0 — see `POSTMORTEM.md` on the `archive/2026-08-post-mortem` branch)

## 1. Goal

A production-grade, reusable Next.js 16 SaaS starter deployed on Railway. Pay the plumbing
tax once so the next idea starts on *the idea*, not on auth/payments/email boilerplate. Reuse
the existing Railway deploy link and Tailwind setup; delete the old fake research engine and
all Indie Research OS product code.

Success = a fresh product can be started by cloning this branch, setting env vars, and building
domain features on top of working auth, subscriptions, agent-payments, email, and a dashboard.

## 2. Stack (locked)

| Concern | Choice | Notes |
|---------|--------|-------|
| Framework | Next.js 16 | App Router, Server Actions, `proxy.ts`, Data Access Layer pattern |
| Auth | Better Auth | email/password + Google; sessions in Postgres. (Auth.js is EOL for new projects — team merged into Better Auth Sept 2025.) |
| ORM | Drizzle | typed schema + `drizzle-kit` migrations |
| Database | Postgres | **Railway Postgres** (always-on, private network, one vendor). Swap host later via `DATABASE_URL` only. |
| Human payments | Stripe | subscriptions + billing portal + webhook sync |
| Agent payments | x402 | reusable `withX402()` pattern + one testnet demo route |
| Email | Resend | verification, receipts, generic send |
| Styling | Tailwind 4 | already in repo |
| Rate limiting | Postgres-backed | single datastore, no extra vendor |
| Deploy | Railway | existing project/link |

### Database host (locked)
- **Railway Postgres.** One vendor with the app, always warm, private-network `DATABASE_URL`.
  Local dev/tests use Docker Postgres via the same `DATABASE_URL` shape. Neon remains a
  documented one-line swap (different host, identical Drizzle schema) — do not add Neon
  client code.

## 3. Module layout

Feature-organized, small focused files (200–400 lines typical). Immutable data patterns
throughout; no mutation of shared objects.

```
app/
  (marketing)/            landing, pricing            ← public
  (app)/                  dashboard, account, billing ← authed (guarded)
  api/
    auth/[...all]/route.ts    Better Auth handler
    stripe/webhook/route.ts   Stripe subscription sync
    paid/demo/route.ts        x402 withX402 demo route
  layout.tsx
proxy.ts                  Better Auth optimistic session cookie check
lib/
  env.ts                  Zod-validated env; fails fast at startup
  auth/                   Better Auth server + client config
  db/
    index.ts              Drizzle client
    schema.ts             tables (see §4)
  dal/                    getUser(), requireUser(), entitlement checks (auth near data)
  payments/               Stripe: checkout, portal, webhook handlers, entitlement helper
  x402/                   resource server + route config
  email/                  Resend wrapper
  ratelimit.ts            Postgres-backed limiter
components/ui/            shared components
tests/                    unit + integration + e2e (see §10)
.env.example             all keys with placeholders (committed)
```

## 4. Data model (Drizzle)

Better Auth-managed tables plus app tables. Minimal — no orgs/teams.

- `user` — id, email, name, emailVerified, image, timestamps (Better Auth)
- `session` — id, userId, token, expiresAt, ip, userAgent (Better Auth)
- `account` — id, userId, providerId, credentials/oauth fields (Better Auth)
- `verification` — id, identifier, value, expiresAt (Better Auth)
- `subscription` — id, userId, stripeCustomerId, stripeSubscriptionId, status, priceId,
  currentPeriodEnd. **Source of truth for entitlement**, synced from Stripe webhooks.
- `rate_limit` — key, count, windowStart. Backing store for `lib/ratelimit.ts`.

## 5. Auth flow

- Better Auth with email/password always on. Google provider enabled only when
  `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.
- Sessions stored in Postgres via Drizzle adapter.
- `proxy.ts`: **optimistic** check only — reads the session cookie, redirects unauthenticated
  requests away from `(app)` routes. No DB calls in proxy (runs on every route, incl. prefetch).
- **Data Access Layer** (`lib/dal`): `requireUser()` performs the real, authoritative check
  close to every data read/mutation — the pattern Next 16 docs recommend. This replaces the RLS
  we'd have gotten from Supabase; authorization lives in code, called near data.
- `getUser()` wrapped in React `cache()` to dedupe per-render.

## 6. Payments — Stripe (human subscriptions)

- One monthly plan. Price ID from `STRIPE_PRICE_ID` — no hardcoded product config, extra
  tiers added per-product.
- Checkout session (Server Action) → Stripe hosted checkout → redirect back.
- Billing portal link for self-serve plan management.
- **Webhook** (`/api/stripe/webhook`): verifies signature, syncs `subscription` table on
  `checkout.session.completed`, `customer.subscription.updated/deleted`.
- `hasActiveSubscription(userId)` entitlement helper used in the DAL to gate paid features.

## 7. Payments — x402 (agent / pay-per-request)

- Second payment axis: pay-per-request in USDC, no account needed. For agent-accessible or
  API-monetized endpoints.
- Integration: per-route `withX402(handler, config, server)` wrapper. **Kept off `proxy.ts`**
  to avoid colliding with Better Auth's use of proxy.
- One live demo route `/api/paid/demo` on **Base Sepolia** testnet (runs with no real funds).
- Env: `RESOURCE_WALLET_ADDRESS`, `NETWORK`, `FACILITATOR_URL`. Documented flip to Base mainnet
  + real wallet. No server-side private keys needed to receive.
- If `RESOURCE_WALLET_ADDRESS` is unset, the demo route returns a clear 501 so the rest of
  the app boots without crypto config.
- Scope: reusable pattern + demo only. No credits ledger / V2 sessions / multi-chain (add
  per-product).

## 8. Email (Resend)

- Wrapper in `lib/email/` with a generic `sendEmail()` plus two launchpad uses:
  Better Auth email verification, and a Stripe checkout receipt.
- From-address via `EMAIL_FROM`. If `RESEND_API_KEY` is unset in development, log the
  intended send instead of crashing (production still fails fast via `lib/env.ts`).

## 9. Cross-cutting requirements (global rules)

- **Input validation:** all route/action inputs validated with Zod at the boundary.
- **Env validation:** `lib/env.ts` fails fast on required secrets (`DATABASE_URL`, Better
  Auth secret, Stripe keys). `RESEND_API_KEY` and `RESOURCE_WALLET_ADDRESS` are optional in
  development, required in production.
- **Rate limiting:** every route/action wrapped by `lib/ratelimit.ts` (Postgres-backed
  fixed window; unauth key = IP + route, auth key = userId + route).
- **Error handling:** explicit at every level; user-friendly messages in UI, detailed logs
  server-side; never swallow errors.
- **Immutability:** no mutation of existing objects; return new copies.
- **Secrets:** none in source; `.env.example` committed with placeholders, `.env` gitignored.
- **File size:** small, focused files; extract utilities; no file > 800 lines.

## 10. Testing (target 80% coverage, TDD)

- **Runner:** Vitest (unit + integration), Playwright (e2e).
- **Unit:** DAL (`requireUser`, entitlement), payment sync logic, x402 route config, env
  validation, rate limiter.
- **Integration:** auth sign-up/login/session, Stripe webhook → subscription sync, x402 demo
  route returns 402 then succeeds after payment (testnet/mocked facilitator).
- **E2E critical path:** sign up → land on dashboard → subscribe → access gated content.
- Written test-first per the TDD workflow.

## 11. Out of scope (YAGNI — add per product)

Teams/orgs, admin panel, analytics, social logins beyond Google, i18n, x402 credits/sessions,
multi-chain x402. **Deleted from repo:** `/api/research` (fake engine), localStorage reports,
`data/beta-signups.json`, `/api/waitlist|beta|checkout|confirm-checkout|metrics`, simulated
Stripe flow, `public/experiment-*.html`, and the Indie Research OS landing content.

## 12. Repo strategy

- Build on `launchpad/saas-starter` off `main` (keeps git history + Railway link).
- Strip the old product code, then build the launchpad modules.
- `POSTMORTEM.md` + `docs/salvage/` remain on the `archive/2026-08-post-mortem` branch and in
  the durable copy at `~/Projects/research-library/indie-research-os/` — not carried into this
  branch.
- Rename `package.json` `name` to `saas-launchpad` during strip. Keep the existing git
  remote and Railway project link.

## 13. Milestones (for the implementation plan)

1. Strip old product code; add stack deps; `lib/env.ts` + `.env.example`.
2. Drizzle schema + client + migrations; Postgres rate limiter.
3. Better Auth (email + Google) + `proxy.ts` + DAL.
4. Rebrandable marketing landing (placeholder product name + pricing CTA) + authed
   dashboard/account/billing shell.
5. Stripe subscriptions + billing portal + webhook sync + entitlement.
6. x402 wrapper + testnet demo route.
7. Resend email flows.
8. Test suite to 80%; Railway deploy verification.

## 14. Key Decisions

- **Better Auth over Supabase Auth / Auth.js / Clerk.** Auth.js is EOL for new projects.
  Better Auth stores users in our Postgres, has first-class Next 16 `proxy.ts` support, and
  keeps a single-vendor Railway footprint.
- **Railway Postgres over Neon.** Next.js on Railway is a long-running process, so
  scale-to-zero and serverless pooling are not wins. One canvas, no cold starts, no
  pooled-vs-direct connection split. Host remains swappable via `DATABASE_URL`.
- **DAL authorization, not RLS.** `proxy.ts` is an optimistic cookie check only;
  `requireUser()` at the data layer is authoritative — the Next 16 recommended pattern.
- **Two payment axes.** Stripe subscriptions for humans with accounts; x402 pay-per-request
  for agents/APIs. x402 stays per-route so it never fights Better Auth for `proxy.ts`.
- **Postgres-backed rate limiter.** One datastore, no extra vendor.
- **Strip the old product in this repo.** Keep git history and the Railway deploy link;
  leave post-mortem/salvage on `archive/2026-08-post-mortem`.
- **YAGNI.** No orgs, admin, analytics, extra social logins, or x402 credits/sessions.

## 15. Open Questions

None. DB host locked to Railway Postgres on 2026-08-21.
