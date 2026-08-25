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
- Vitest

## Setup

1. Copy env and fill placeholders:

```bash
cp .env.example .env.local
```

2. Start local Postgres:

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

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm test` | Vitest unit/integration |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:coverage` | Coverage with 80% `lib/` thresholds |

## Rebrand

Update `lib/config/product.ts` (`name`, `tagline`, `description`) before shipping a new product on this base.
