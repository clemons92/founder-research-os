# SaaS Launchpad

Reusable Next.js 16 starter for shipping auth, subscriptions, and agent payments so the next product starts on the idea.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind 4
- Better Auth
- Drizzle ORM + Postgres (Railway / local Docker)
- Stripe subscriptions
- x402 agent payments
- Resend email
- Zod env validation
- Vitest + Playwright

## Local setup

1. Copy env and fill placeholders (or use `.env` — both are gitignored):

```bash
cp .env.example .env.local
```

2. Start local Postgres (user `launchpad`, password `launchpad`, db `launchpad` on port 5432):

```bash
docker compose up -d
```

3. Install and migrate:

```bash
npm install
npm run db:migrate
```

4. Run the app:

```bash
npm run dev
```

Local Stripe webhooks (test mode):

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Paste the CLI `whsec_...` into `STRIPE_WEBHOOK_SECRET`.

## Railway deploy

1. Create or reuse a Railway project and add the **Postgres** plugin. Railway injects `DATABASE_URL` on the private network.
2. Set `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`. Railway injects `DATABASE_URL`. Everything else in `.env.example` is optional and enables that feature (Stripe billing, Resend email, Google sign-in, x402).
3. Start command (uses this repo's migrate script, not `drizzle-kit migrate`):

```bash
npm run db:migrate && npm run start
```

4. Point Stripe webhooks at `https://<your-domain>/api/stripe/webhook`.

### x402 mainnet

Dev defaults to Base Sepolia (`NETWORK=base-sepolia`). To receive real USDC on Base:

```
NETWORK=base
RESOURCE_WALLET_ADDRESS=0xYourWallet
```

Leave `RESOURCE_WALLET_ADDRESS` unset in development — the demo route returns 501.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run db:migrate` | Apply Drizzle migrations |
| `npm test` | Vitest unit/integration |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:coverage` | Coverage with 80% `lib/` thresholds |
| `npm run test:e2e` | Playwright critical path |

## Rebrand

Update `lib/config/product.ts` (`name`, `tagline`, `description`) before shipping a new product on this base.
