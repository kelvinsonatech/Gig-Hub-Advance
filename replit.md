# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite (artifacts/gigshub)
- **State management**: Zustand (auth state)
- **Animations**: Framer Motion

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── gigshub/            # GigsHub React+Vite frontend (main app)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
│   └── src/seed.ts         # Database seeder (networks, bundles, services)
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package
```

## GigsHub App (artifacts/gigshub)

A Ghanaian digital services marketplace with:

### Pages
- `/` - Landing page (public)
- `/login` - Sign in
- `/register` - Create account
- `/dashboard` - User dashboard (requires auth)
- `/bundles` - Buy data bundles (requires auth)
- `/services` - All available services
- `/wallet` - Wallet balance + top up
- `/orders` - Order history
- `/afa-registration` - AFA/Ghana Card registration
- `/agent-registration` - Become a GigsHub agent

### Features
- JWT authentication (token in localStorage)
- Wallet system (GHS balance, top up via MoMo)
- Data bundle purchasing for MTN, AirtelTigo, Telecel
- AFA Registration service
- Agent Registration
- Order history with status tracking
- Live chat support (floating widget for users, admin chat panel)
  - DB: `conversations` + `chat_messages` tables
  - User API: `GET/POST /api/chat`, `GET /api/chat/unread`
  - Admin API: `GET /api/admin/chats`, `GET/POST /api/admin/chats/:id`, `PATCH /api/admin/chats/:id/close|reopen`
  - Frontend: `ChatWidget.tsx` (floating bubble), `AdminChat.tsx` (admin panel)
- Voucher/Gift system
  - DB: `vouchers` + `voucher_redemptions` tables (unique constraint on voucher_id+user_id)
  - User API: `POST /api/vouchers/redeem` (atomic transaction, race-safe)
  - Admin API: `GET/POST /api/admin/vouchers`, `GET /api/admin/vouchers/:id/redemptions`, `DELETE /api/admin/vouchers/:id`
  - Frontend: Gift icon in Navbar opens redeem modal; `AdminVouchers.tsx` for CRUD + redemption history

### Branding
- Primary: #0077C7 (blue)
- Logo: attached_assets/logo.png
- Currency: GHS (Ghana Cedis)

## API Routes

- `POST /api/auth/register` - Register user + auto-creates wallet
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires Bearer token)
- `PUT /api/auth/avatar-style` - Update user avatar style (requires auth)
- `GET /api/networks` - List network providers
- `GET /api/bundles?networkId=&type=` - List data bundles
- `GET /api/services` - List services
- `GET /api/wallet` - Get wallet + transactions (requires auth)
- `POST /api/wallet/topup` - Top up wallet (requires auth)
- `GET /api/orders` - Get user orders (requires auth)
- `POST /api/orders` - Create order/purchase (requires auth)
- `GET /api/purchases/live` - Public feed of today's purchases (first name + bundle info only, no auth)
- `POST /api/webhooks/jessco` - JessCo fulfillment webhook (authenticated via x-webhook-secret header)
- `GET /api/admin/sales-stats` - Sales analytics: today/yesterday/week/month/all-time revenue + counts, pending/failed counts, recent 10 orders (admin only)
- `GET /api/admin/settings/fulfillment` - Get current fulfillment mode (manual/api)
- `PUT /api/admin/settings/fulfillment` - Set fulfillment mode (manual/api)
- `POST /api/admin/orders/:id/retry-fulfillment` - Manually retry JessCo fulfillment for a specific order

## Fulfillment System

Two modes controlled from Admin > Settings:
- **Manual**: Admin processes orders manually, updates status from Orders page
- **API (JessCo)**: Orders auto-sent to JessCo (jesscostore.com/api/v1) after payment; webhook callbacks update status

Key files:
- `artifacts/api-server/src/lib/jessco.ts` - JessCo API client (fulfillBundle + webhook handler), connects to jesscostore.com
- `artifacts/api-server/src/lib/settings.ts` - App settings (fulfillment mode) via app_settings DB table
- `artifacts/gigshub/src/pages/admin/AdminSettings.tsx` - Admin settings page with mode toggle

JessCo API flow: fetches available packages → matches by network/data/price → sends POST /purchase with package ID
Secrets: `XPRESPORTAL_API_KEY` (JessCo API key, starts with jsk_), `XPRESPORTAL_WEBHOOK_SECRET` (JessCo webhook secret)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly`

## Database

Networks: MTN Ghana, AirtelTigo, Telecel Ghana
Bundles: 16 bundles seeded (daily/weekly/monthly/special)
Services: 7 services seeded (AFA registration, agent registration, SIM registration, etc.)

Seed: `pnpm --filter @workspace/scripts run seed`
Push schema: `pnpm --filter @workspace/db run push`

## Auth

JWT tokens signed with `JWT_SECRET` env var (defaults to dev key).
Set `JWT_SECRET` in production for security.

## Wallet Payment Flow

Wallet debit uses atomic SQL (`UPDATE ... WHERE balance >= amount`) to prevent race conditions on concurrent purchases. The balance check and debit happen in a single query — no double-spend is possible.

Wallet credits (top-ups) **must** go through Paystack: client calls `POST /api/payments/initialize` then `POST /api/wallet/topup/verify`. The legacy `POST /api/wallet/topup` endpoint that credited balance directly was removed (returns 410 Gone) — it was a vulnerability that let any authenticated user mint funds.

## Payment Verification System

Single source of truth: `artifacts/api-server/src/lib/payment-reconciler.ts` exports `verifyAndProcessIntent(reference, source)`. Used by:
- Paystack webhook (`routes/webhooks.ts`)
- Frontend redirect callback (`POST /api/orders` in `routes/orders.ts`)
- Wallet topup verify (`POST /api/wallet/topup/verify` in `routes/wallet.ts`)
- Background reconciler poller (`startPaymentReconciler` in `index.ts`, every 45s)
- Admin manual force-verify (`POST /api/admin/payment-intents/:reference/reconcile`)

**Race-safety**: idempotency is enforced by an atomic claim — `UPDATE payment_intents SET status='processed' WHERE reference=? AND status='pending' RETURNING *` inside a transaction. Only one concurrent caller wins; the others see 0 rows returned and short-circuit to `order_already_exists`. If the subsequent INSERT throws, the whole tx rolls back so a retry can succeed.

**Reconciler poller**: scans `pending` intents 60s–60min old, asks Paystack directly. Catches missed/delayed webhooks. Sends Telegram alert on recovery. Also expires ancient pending intents (past `expiresAt`).

**Admin observability**: `GET /api/admin/payment-health` returns counts + reconciler heartbeat. UI at `/admin/payments` (`AdminPayments.tsx`).

## Deployment

- **Frontend (Vercel)**: turboghana.com — push to GitHub triggers rebuild. Set `VITE_API_URL` in Vercel env vars to point at the Replit API server.
- **API (Replit Reserved VM)**: Publish from Replit for always-on API. Uses `SUPABASE_DATABASE_URL` for production database.
- The generated API client (`@workspace/api-client-react`) is configured in `main.tsx` via `setBaseUrl(API)` and `setAuthTokenGetter()` to point at the correct API server and attach auth tokens automatically.

## Image Loading & Avatars

- **UserAvatar** (`components/ui/UserAvatar.tsx`): Fetches DiceBear SVGs, caches in localStorage (7-day expiry), shows colored initial placeholder while loading, fades in smoothly.
- **FadeImage** (`components/ui/FadeImage.tsx`): Reusable image component with opacity fade-in transition and error fallback support.
- **Image preloader** (`hooks/use-image-preloader.ts`): Preloads static images, network logos (from API), and user avatar on mount. Uses deduplication set.
- **Auth fetch interceptor** (`App.tsx`): Global fetch override only adds auth token for same-origin and API-origin requests — never for third-party URLs.

## Packages

### `artifacts/api-server` (`@workspace/api-server`)
Express 5 API server with bcryptjs + jsonwebtoken for auth.
Additional deps: bcryptjs, jsonwebtoken

### `artifacts/gigshub` (`@workspace/gigshub`)
React + Vite frontend. Key deps: wouter, zustand, framer-motion, date-fns, @tanstack/react-query

### `lib/db` (`@workspace/db`)
Drizzle ORM schema: users, networks, bundles, wallets, transactions, orders, services

### `lib/api-spec` (`@workspace/api-spec`)
OpenAPI 3.1 spec with full GigsHub API contract. Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)
Generated Zod schemas from the OpenAPI spec.

### `lib/api-client-react` (`@workspace/api-client-react`)
Generated React Query hooks and fetch client.

### `scripts` (`@workspace/scripts`)
Utility scripts: `seed` (database seeder)
