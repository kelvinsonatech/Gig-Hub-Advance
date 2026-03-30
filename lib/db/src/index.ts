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
    "[db] No database connection string found. " +
    "Set DATABASE_URL (local) or SUPABASE_DATABASE_URL (production)."
  );
}

export const pool = connectionString
  ? new Pool({
      connectionString,
      max: 3,
      ssl: connectionString.includes("supabase") || connectionString.includes("neon")
        ? { rejectUnauthorized: false }
        : undefined,
    })
  : null as unknown as pg.Pool;

export const db = connectionString
  ? drizzle(pool, { schema })
  : null as unknown as ReturnType<typeof drizzle>;

export * from "./schema";
