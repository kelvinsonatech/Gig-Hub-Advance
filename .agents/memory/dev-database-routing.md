---
name: Dev database routing
description: Which database each tool/env var actually points to in this project
---

# The app database is Supabase, not the Replit built-in Postgres

**Rule:** The api-server (dev AND prod) connects to Supabase. The `executeSql` sandbox tool and the `DATABASE_URL` env var point at the Replit built-in Postgres, which does NOT contain the app tables. For manual queries/cleanup use `psql "$SUPABASE_DATABASE_URL"`.

**Why:** Running cleanup via executeSql / DATABASE_URL fails with "relation does not exist" and can silently do nothing — dev and prod share the same Supabase DB, so test-data cleanup matters.

**How to apply:** Any direct SQL against app data (users, orders, allowed_numbers, payment_intents…) must use `$SUPABASE_DATABASE_URL`. Drizzle push (`pnpm --filter @workspace/db run push`) is already configured correctly.
