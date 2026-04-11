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

### Branding
- Primary: #0077C7 (blue)
- Logo: attached_assets/logo.png
- Currency: GHS (Ghana Cedis)

## API Routes

- `POST /api/auth/register` - Register user + auto-creates wallet
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires Bearer token)
- `GET /api/networks` - List network providers
- `GET /api/bundles?networkId=&type=` - List data bundles
- `GET /api/services` - List services
- `GET /api/wallet` - Get wallet + transactions (requires auth)
- `POST /api/wallet/topup` - Top up wallet (requires auth)
- `GET /api/orders` - Get user orders (requires auth)
- `POST /api/orders` - Create order/purchase (requires auth)
- `GET /api/purchases/live` - Public feed of today's purchases (first name + bundle info only, no auth)
- `POST /api/webhooks/jessco` - JessCo fulfillment webhook

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
