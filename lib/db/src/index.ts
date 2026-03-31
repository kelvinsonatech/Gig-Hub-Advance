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
} else {
  // Log the host portion only (no password) for debugging
  try {
    const u = new URL(connectionString);
    console.info(`[db] Connecting to ${u.hostname}:${u.port}${u.pathname} as ${u.username.split(".")[0]}...`);
  } catch {
    console.info("[db] Connection string configured (could not parse for logging)");
  }
}

const isSupabase = connectionString?.includes("supabase") ?? false;
const isNeon = connectionString?.includes("neon") ?? false;
const needsSsl = isSupabase || isNeon;

export const pool = connectionString
  ? new Pool({
      connectionString,
      max: isDev ? 3 : 1,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 15_000,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    })
  : null as unknown as pg.Pool;

// Test connection on startup and log the result clearly
if (pool) {
  pool.connect()
    .then(client => {
      console.info("[db] ✓ Database connection successful");
      client.release();
    })
    .catch(err => {
      console.error("[db] ✗ Database connection FAILED:", err.message);
      console.error("[db] Check that SUPABASE_DATABASE_URL is set correctly in Vercel.");
      console.error("[db] It must be the Transaction Pooler URL (port 6543) from Supabase dashboard.");
    });
}

export const db = connectionString
  ? drizzle(pool, { schema })
  : null as unknown as ReturnType<typeof drizzle>;

export * from "./schema";
