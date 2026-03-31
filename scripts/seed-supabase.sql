-- ── Schema ─────────────────────────────────────────────────────────────────
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

-- ── Admin user (password: Admin@GigsHub2025 bcrypt hash) ───────────────────
INSERT INTO users (name, email, password, role)
VALUES (
  'Admin',
  'admin@gigshub.store',
  '$2b$10$tngaG7DXZ927zLhCByW/FOuGbsXOxd.jDtuwrrI81lB8aleJp6Zt6',
  'admin'
)
ON CONFLICT (email) DO NOTHING;

-- ── Networks ───────────────────────────────────────────────────────────────
INSERT INTO networks (name, code, color, logo_url, tagline) VALUES
  ('MTN Ghana',     'MTN',     '#FFCC00', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/New-mtn-logo.jpg/500px-New-mtn-logo.jpg',                                    'Ghana''s Largest Network'),
  ('AirtelTigo',    'AT',      '#004b87', 'https://recharge-prd.asset.akeneo.cloud/product_assets/media/recharge_com_airteltigo_product_card.png',                                 'Connecting Communities'),
  ('Telecel Ghana', 'TELECEL', '#CC0000', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRJQ6fNzCpMhlyaxWqlXYqmY7Bb5KZBIQt_1Q&s',                                      'Fast & Reliable Data')
ON CONFLICT (code) DO UPDATE SET
  name     = EXCLUDED.name,
  color    = EXCLUDED.color,
  logo_url = EXCLUDED.logo_url,
  tagline  = EXCLUDED.tagline;

-- ── Bundles ────────────────────────────────────────────────────────────────
-- Clear and re-seed so IDs match network IDs above
DELETE FROM bundles;

INSERT INTO bundles (network_id, network_name, name, data, validity, price, type, popular)
SELECT n.id, 'MTN Ghana', v.name, v.data, v.validity, v.price::NUMERIC, v.type, v.popular::BOOLEAN
FROM networks n,
     (VALUES
       ('MTN 1GB Daily',   '1GB',  '1 Day',   '2.00',  'daily',   'false'),
       ('MTN 2GB Daily',   '2GB',  '1 Day',   '3.50',  'daily',   'true'),
       ('MTN 5GB Weekly',  '5GB',  '7 Days',  '10.00', 'weekly',  'true'),
       ('MTN 10GB Weekly', '10GB', '7 Days',  '18.00', 'weekly',  'false'),
       ('MTN 15GB Monthly','15GB', '30 Days', '35.00', 'monthly', 'true'),
       ('MTN 30GB Monthly','30GB', '30 Days', '60.00', 'monthly', 'false'),
       ('MTN 50GB Special','50GB', '30 Days', '90.00', 'special', 'true')
     ) AS v(name, data, validity, price, type, popular)
WHERE n.code = 'MTN';

INSERT INTO bundles (network_id, network_name, name, data, validity, price, type, popular)
SELECT n.id, 'AirtelTigo', v.name, v.data, v.validity, v.price::NUMERIC, v.type, v.popular::BOOLEAN
FROM networks n,
     (VALUES
       ('AT 1.5GB Daily',  '1.5GB','1 Day',   '2.50',  'daily',   'false'),
       ('AT 3GB Daily',    '3GB',  '1 Day',   '4.00',  'daily',   'true'),
       ('AT 8GB Weekly',   '8GB',  '7 Days',  '14.00', 'weekly',  'true'),
       ('AT 20GB Monthly', '20GB', '30 Days', '40.00', 'monthly', 'true'),
       ('AT 40GB Monthly', '40GB', '30 Days', '70.00', 'monthly', 'false')
     ) AS v(name, data, validity, price, type, popular)
WHERE n.code = 'AT';

INSERT INTO bundles (network_id, network_name, name, data, validity, price, type, popular)
SELECT n.id, 'Telecel Ghana', v.name, v.data, v.validity, v.price::NUMERIC, v.type, v.popular::BOOLEAN
FROM networks n,
     (VALUES
       ('Telecel 1GB Daily',    '1GB',  '1 Day',   '1.80',  'daily',   'false'),
       ('Telecel 5GB Weekly',   '5GB',  '7 Days',  '9.00',  'weekly',  'true'),
       ('Telecel 15GB Monthly', '15GB', '30 Days', '32.00', 'monthly', 'true'),
       ('Telecel 30GB Special', '30GB', '30 Days', '55.00', 'special', 'true')
     ) AS v(name, data, validity, price, type, popular)
WHERE n.code = 'TELECEL';

SELECT 'Networks: ' || COUNT(*) FROM networks;
SELECT 'Bundles:  ' || COUNT(*) FROM bundles;
SELECT 'Users:    ' || COUNT(*) FROM users;
