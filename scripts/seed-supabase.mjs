import pg from "pg";
import bcrypt from "bcryptjs";

const { Pool } = pg;

const url = process.env.SUPABASE_DATABASE_URL;
if (!url) { console.error("SUPABASE_DATABASE_URL not set"); process.exit(1); }

// Use session-mode URL (port 5432) for DDL; pooler (6543) is fine for DML
const pool = new Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 20_000,
});

const client = await pool.connect();
console.log("✓ Connected to Supabase");

try {
  await client.query("BEGIN");

  // ── Schema ────────────────────────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS networks (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#000000',
      logo_url TEXT,
      tagline TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
      popular BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      price NUMERIC(10,2) NOT NULL,
      icon_url TEXT,
      brand_color TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS wallets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      balance NUMERIC(10,2) NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      amount NUMERIC(10,2) NOT NULL,
      description TEXT,
      details JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      read BOOLEAN NOT NULL DEFAULT FALSE,
      broadcast BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS device_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      platform TEXT NOT NULL DEFAULT 'web',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("✓ Schema created / verified");

  // ── Admin user ────────────────────────────────────────────────────────────
  const hash = await bcrypt.hash("Admin@GigsHub2025", 10);
  await client.query(`
    INSERT INTO users (name, email, password, role)
    VALUES ('Admin', 'admin@gigshub.store', $1, 'admin')
    ON CONFLICT (email) DO NOTHING
  `, [hash]);
  console.log("✓ Admin user seeded");

  // ── Networks ──────────────────────────────────────────────────────────────
  await client.query(`
    INSERT INTO networks (name, code, color, logo_url, tagline) VALUES
      ('MTN Ghana',     'MTN',     '#FFCC00', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/New-mtn-logo.jpg/500px-New-mtn-logo.jpg',                                       'Ghana''s Largest Network'),
      ('AirtelTigo',    'AT',      '#004b87', 'https://recharge-prd.asset.akeneo.cloud/product_assets/media/recharge_com_airteltigo_product_card.png',                                    'Connecting Communities'),
      ('Telecel Ghana', 'TELECEL', '#CC0000', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRJQ6fNzCpMhlyaxWqlXYqmY7Bb5KZBIQt_1Q&s',                                         'Fast & Reliable Data')
    ON CONFLICT (code) DO UPDATE SET
      name    = EXCLUDED.name,
      color   = EXCLUDED.color,
      logo_url = EXCLUDED.logo_url,
      tagline = EXCLUDED.tagline
  `);
  console.log("✓ Networks seeded");

  // ── Bundles ───────────────────────────────────────────────────────────────
  // Get network IDs
  const { rows: nets } = await client.query(`SELECT id, code FROM networks`);
  const netId = (code) => nets.find(n => n.code === code)?.id;

  const mtn = netId('MTN');
  const at  = netId('AT');
  const tel = netId('TELECEL');

  // Delete existing bundles and re-seed cleanly
  await client.query(`DELETE FROM bundles`);

  await client.query(`
    INSERT INTO bundles (network_id, network_name, name, data, validity, price, type, popular) VALUES
      ($1, 'MTN Ghana',     'MTN 1GB Daily',       '1GB',    '1 Day',   2.00,  'daily',   false),
      ($1, 'MTN Ghana',     'MTN 2GB Daily',        '2GB',    '1 Day',   3.50,  'daily',   true),
      ($1, 'MTN Ghana',     'MTN 5GB Weekly',       '5GB',    '7 Days',  10.00, 'weekly',  true),
      ($1, 'MTN Ghana',     'MTN 10GB Weekly',      '10GB',   '7 Days',  18.00, 'weekly',  false),
      ($1, 'MTN Ghana',     'MTN 15GB Monthly',     '15GB',   '30 Days', 35.00, 'monthly', true),
      ($1, 'MTN Ghana',     'MTN 30GB Monthly',     '30GB',   '30 Days', 60.00, 'monthly', false),
      ($1, 'MTN Ghana',     'MTN 50GB Special',     '50GB',   '30 Days', 90.00, 'special', true),
      ($2, 'AirtelTigo',    'AT 1.5GB Daily',       '1.5GB',  '1 Day',   2.50,  'daily',   false),
      ($2, 'AirtelTigo',    'AT 3GB Daily',         '3GB',    '1 Day',   4.00,  'daily',   true),
      ($2, 'AirtelTigo',    'AT 8GB Weekly',        '8GB',    '7 Days',  14.00, 'weekly',  true),
      ($2, 'AirtelTigo',    'AT 20GB Monthly',      '20GB',   '30 Days', 40.00, 'monthly', true),
      ($2, 'AirtelTigo',    'AT 40GB Monthly',      '40GB',   '30 Days', 70.00, 'monthly', false),
      ($3, 'Telecel Ghana', 'Telecel 1GB Daily',    '1GB',    '1 Day',   1.80,  'daily',   false),
      ($3, 'Telecel Ghana', 'Telecel 5GB Weekly',   '5GB',    '7 Days',  9.00,  'weekly',  true),
      ($3, 'Telecel Ghana', 'Telecel 15GB Monthly', '15GB',   '30 Days', 32.00, 'monthly', true),
      ($3, 'Telecel Ghana', 'Telecel 30GB Special', '30GB',   '30 Days', 55.00, 'special', true)
  `, [mtn, at, tel]);
  console.log("✓ Bundles seeded (16 total)");

  await client.query("COMMIT");
  console.log("\n✅ Supabase fully seeded and ready for Vercel.");

} catch (err) {
  await client.query("ROLLBACK");
  console.error("✗ Error:", err.message);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
