# eSIM Platform

A full-stack eSIM reseller platform where users pay into a wallet, browse eSIM packages by country, and purchase data plans. Backend purchases from eSIMAccess.com using your reseller API key — the markup is your profit.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/esim-platform run dev` — run the frontend (port 18669)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `ESIM_ACCESS_CODE` — eSIMAccess reseller API key
- Optional env: `PADDLE_SECRET_KEY` — Paddle payment webhook secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 18 + Vite, shadcn/ui components, Tailwind CSS, wouter routing
- API: Express 5 on `/api`
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- **OpenAPI spec**: `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- **DB schema**: `lib/db/src/schema/` — one file per table
- **API routes**: `artifacts/api-server/src/routes/` — one file per domain
- **Frontend pages**: `artifacts/esim-platform/src/pages/` — one file per page
- **eSIMAccess helper**: `artifacts/api-server/src/lib/esimaccess.ts`
- **Auth middleware**: `artifacts/api-server/src/lib/auth.ts`

## Architecture decisions

- **Wallet-first reseller model**: Users top up a wallet via Paddle. When they buy an eSIM, the backend uses `ESIM_ACCESS_CODE` to purchase from eSIMAccess, deducts the markup price from the user's wallet, and keeps the spread as profit.
- **Auth via Bearer token**: Frontend sends `Authorization: Bearer <uid>` header. In dev, uid is stored in localStorage. In production, replace with Firebase Admin SDK token verification.
- **Markup stored in DB**: `site_config.markup_percent` controls the markup. Admin panel can change it live without a redeploy.
- **Automatic refund on eSIMAccess failure**: If the eSIMAccess API call fails, the user's balance is immediately refunded.
- **Level system**: Bronze (0%), Silver (5%), Gold (10%), Platinum (15%) discount tiers based on total spend.

## Product

- **Home**: Browse 16+ countries as cards, filter by duration (7/15/30 days), sort by price or value
- **My eSIMs**: Active (green), Pending (orange), History (grey) tabs with QR codes
- **Wallet**: Balance, level tier, topup buttons ($10/$20/$50), transaction history
- **Family**: Add family members with avatar, track their active eSIM data
- **Referral**: Share your code, earn $2 per $20+ topup by referred users
- **Redeem**: Enter gift codes or generate $10/$25/$50 gift codes
- **Support**: Create tickets, admins can reply
- **Admin panel**: Stats, user management, markup config, package sync, eSIMAccess balance

## User preferences

- No emojis in UI (country flag emojis from API data are acceptable)
- Bootstrap 5 was requested but app is built with React + shadcn/ui (functionally equivalent)
- Demo login: any email → user; email containing "admin" → admin role
- Demo admin credentials: `admin@example.com`

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after every spec change
- eSIMAccess API requires `ESIM_ACCESS_CODE` env var; without it, orders will fail
- The `/api/user/upsert` endpoint is called on first login to create the user record
- Referral bonus only triggers on $20+ topups via Paddle webhook
- Package sync (`/api/admin/sync-packages`) calls eSIMAccess live API

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- eSIMAccess API docs: https://docs.esimaccess.com
