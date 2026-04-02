/**
 * Migrates data from Supabase to Replit's built-in PostgreSQL database.
 */
import pg from "pg";

const { Pool } = pg;

const supabaseUrl = process.env.SUPABASE_DATABASE_URL;
const replitUrl = process.env.DATABASE_URL;

if (!supabaseUrl) throw new Error("SUPABASE_DATABASE_URL is not set");
if (!replitUrl) throw new Error("DATABASE_URL is not set");

const supabase = new Pool({ connectionString: supabaseUrl, ssl: { rejectUnauthorized: false } });
const replit = new Pool({ connectionString: replitUrl });

async function run() {
  const src = await supabase.connect();
  const dst = await replit.connect();

  try {
    console.log("Connected to both databases.\n");

    // Set search path so we always hit public schema in Supabase
    await src.query("SET search_path TO public");

    // ── 1. Create enums ────────────────────────────────────────────────────
    console.log("Creating enums...");
    await dst.query(`
      DO $$ BEGIN CREATE TYPE user_role AS ENUM ('user', 'agent', 'admin');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN CREATE TYPE transaction_type AS ENUM ('credit', 'debit');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // ── 2. Create tables ───────────────────────────────────────────────────
    console.log("Creating tables...");
    await dst.query(`
      CREATE TABLE IF NOT EXISTS networks (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL,
        logo_url TEXT,
        tagline TEXT
      );

      CREATE TABLE IF NOT EXISTS bundles (
        id SERIAL PRIMARY KEY,
        network_id INTEGER NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
        network_name TEXT NOT NULL,
        name TEXT NOT NULL,
        data TEXT NOT NULL,
        validity TEXT NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        type TEXT NOT NULL DEFAULT 'data',
        popular BOOLEAN NOT NULL DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        icon_url TEXT,
        brand_color TEXT
      );

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role user_role NOT NULL DEFAULT 'user',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS wallets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        balance NUMERIC(12,2) NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'GHS'
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        wallet_id INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
        type transaction_type NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        amount NUMERIC(10,2) NOT NULL,
        description TEXT,
        details JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'info',
        read BOOLEAN NOT NULL DEFAULT FALSE,
        broadcast BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS device_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        platform TEXT NOT NULL DEFAULT 'web',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("Tables ready.\n");

    // ── 3. Copy each table ─────────────────────────────────────────────────
    const tables = [
      {
        name: "networks",
        src: "SELECT id, name, code, color, logo_url, tagline FROM networks ORDER BY id",
        dst: `INSERT INTO networks (id, name, code, color, logo_url, tagline)
              VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO UPDATE
              SET name=EXCLUDED.name, code=EXCLUDED.code, color=EXCLUDED.color,
                  logo_url=EXCLUDED.logo_url, tagline=EXCLUDED.tagline`,
        vals: (r) => [r.id, r.name, r.code, r.color, r.logo_url, r.tagline],
      },
      {
        name: "bundles",
        src: "SELECT id, network_id, network_name, name, data, validity, price, type::text, popular FROM bundles ORDER BY id",
        dst: `INSERT INTO bundles (id, network_id, network_name, name, data, validity, price, type, popular)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
        vals: (r) => [r.id, r.network_id, r.network_name, r.name, r.data, r.validity, r.price, r.type, r.popular],
      },
      {
        name: "services",
        src: "SELECT id, name, description, category, price, icon_url, brand_color FROM services ORDER BY id",
        dst: `INSERT INTO services (id, name, description, category, price, icon_url, brand_color)
              VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        vals: (r) => [r.id, r.name, r.description, r.category, r.price, r.icon_url, r.brand_color],
      },
      {
        name: "users",
        src: "SELECT id, name, email, phone, password_hash, role::text, created_at FROM public.users ORDER BY id",
        dst: `INSERT INTO users (id, name, email, phone, password_hash, role, created_at)
              VALUES ($1,$2,$3,$4,$5,$6::user_role,$7) ON CONFLICT (id) DO NOTHING`,
        vals: (r) => [r.id, r.name, r.email, r.phone, r.password_hash, r.role, r.created_at],
      },
      {
        name: "wallets",
        src: "SELECT id, user_id, balance, currency FROM wallets ORDER BY id",
        dst: `INSERT INTO wallets (id, user_id, balance, currency)
              VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
        vals: (r) => [r.id, r.user_id, r.balance, r.currency],
      },
      {
        name: "orders",
        src: "SELECT id, user_id, type::text, status::text, amount, details, created_at FROM orders ORDER BY id",
        dst: `INSERT INTO orders (id, user_id, type, status, amount, details, created_at)
              VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        vals: (r) => [r.id, r.user_id, r.type, r.status, r.amount, r.details, r.created_at],
      },
      {
        name: "notifications",
        src: "SELECT id, user_id, title, message, type, read, broadcast, created_at FROM notifications ORDER BY id",
        dst: `INSERT INTO notifications (id, user_id, title, message, type, read, broadcast, created_at)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        vals: (r) => [r.id, r.user_id, r.title, r.message, r.type, r.read, r.broadcast, r.created_at],
      },
    ];

    for (const table of tables) {
      const { rows } = await src.query(table.src);
      for (const row of rows) {
        await dst.query(table.dst, table.vals(row));
      }
      // Sync the sequence so new inserts don't conflict
      if (rows.length > 0) {
        await dst.query(
          `SELECT setval(pg_get_serial_sequence('${table.name}', 'id'), MAX(id)) FROM ${table.name}`
        );
      }
      console.log(`  ${table.name}: ${rows.length} row(s) copied`);
    }

    console.log("\nMigration complete! All Supabase data is now in Replit's database.");
  } finally {
    src.release();
    dst.release();
    await supabase.end();
    await replit.end();
  }
}

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
