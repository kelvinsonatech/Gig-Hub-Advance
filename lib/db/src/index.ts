import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Prefer Supabase; fall back to Replit's built-in DB
const connectionString = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "[db] FATAL: No database connection string found. " +
    "Set DATABASE_URL in your environment variables."
  );
} else {
  try {
    const u = new URL(connectionString);
    console.info(`[db] Connecting to ${u.hostname}:${u.port}${u.pathname}...`);
  } catch {
    console.info("[db] Connection string configured (could not parse for logging)");
  }
}

const isNeon = connectionString?.includes("neon") ?? false;
const isSupabase = connectionString?.includes("supabase") ?? false;
const needsSsl = isNeon || isSupabase;

const pool_ = connectionString
  ? new Pool({
      connectionString,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 15_000,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    })
  : null;

// Ensure Supabase connections resolve tables in the public schema first
if (pool_ && isSupabase) {
  pool_.on("connect", (client) => {
    client.query("SET search_path TO public");
  });
}

export const pool = pool_ as pg.Pool;

if (pool) {
  pool.connect()
    .then(client => {
      console.info("[db] Database connection successful");
      client.release();
    })
    .catch(err => {
      console.error("[db] Database connection FAILED:", err.message);
      console.error("[db] Check that DATABASE_URL is set correctly in your environment.");
    });
}

export const db = connectionString
  ? drizzle(pool, { schema })
  : null as unknown as ReturnType<typeof drizzle>;

export * from "./schema";
