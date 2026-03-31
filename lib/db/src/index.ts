import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const isDev = process.env.NODE_ENV === "development";

const connectionString = isDev
  ? (process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL)
  : (process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL);

if (!connectionString) {
  console.error(
    "[db] FATAL: No database connection string found. " +
    "Set SUPABASE_DATABASE_URL in your Vercel environment variables.\n" +
    "Use the Transaction Pooler URL from Supabase (port 6543)."
  );
}

const isSupabase = connectionString?.includes("supabase") ?? false;
const isNeon = connectionString?.includes("neon") ?? false;
const needsSsl = isSupabase || isNeon;

export const pool = connectionString
  ? new Pool({
      connectionString,
      max: isDev ? 3 : 1,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    })
  : null as unknown as pg.Pool;

export const db = connectionString
  ? drizzle(pool, { schema })
  : null as unknown as ReturnType<typeof drizzle>;

export * from "./schema";
