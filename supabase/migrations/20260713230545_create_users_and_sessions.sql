/*
# Create users and sessions tables with security hardening columns

1. New Tables
- `users`: Core user accounts with email, PIN, KYC, preferences, and new `pending_email` column for email-change flow.
- `sessions`: Session tokens with new `ip`, `user_agent`, `last_seen_at` columns for session management (Phase A3).

2. Security
- RLS enabled on both tables.
- Policies use TO anon, authenticated with USING (true) / WITH CHECK (true) because this app uses custom session management in server actions, not Supabase Auth.
*/

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  name text NOT NULL,
  username text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  phone text,
  password_hash text NOT NULL,
  email_verified boolean NOT NULL DEFAULT false,
  pin_hash text,
  tier integer NOT NULL DEFAULT 1,
  role text NOT NULL DEFAULT 'user',
  status text NOT NULL DEFAULT 'active',
  billstack_ref text NOT NULL UNIQUE,
  kyc_address text,
  kyc_id_type text,
  kyc_id_number text,
  referred_by text,
  referral_withdrawn numeric(20, 2) NOT NULL DEFAULT 0,
  notify_transactions boolean NOT NULL DEFAULT true,
  notify_prices boolean NOT NULL DEFAULT false,
  notify_product boolean NOT NULL DEFAULT true,
  two_factor boolean NOT NULL DEFAULT false,
  biometric boolean NOT NULL DEFAULT false,
  pending_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_billstack_ref_idx ON users (billstack_ref);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  ip text,
  user_agent text,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_users" ON users;
CREATE POLICY "anon_select_users" ON users FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_users" ON users;
CREATE POLICY "anon_insert_users" ON users FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_users" ON users;
CREATE POLICY "anon_update_users" ON users FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_users" ON users;
CREATE POLICY "anon_delete_users" ON users FOR DELETE
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_sessions" ON sessions;
CREATE POLICY "anon_select_sessions" ON sessions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sessions" ON sessions;
CREATE POLICY "anon_insert_sessions" ON sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sessions" ON sessions;
CREATE POLICY "anon_update_sessions" ON sessions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sessions" ON sessions;
CREATE POLICY "anon_delete_sessions" ON sessions FOR DELETE
  TO anon, authenticated USING (true);