/*
# Create auth_tokens, admin_audit_log, referrals, and notifications tables

1. New Tables
- `auth_tokens`: Short-lived OTP/reset tokens (email_verify, password_reset, email_change).
- `admin_audit_log`: Immutable log of privileged admin actions.
- `referrals`: Referral relationships between users.
- `notifications`: User-facing notifications.

2. Security
- RLS enabled on all tables with anon, authenticated access.
*/

CREATE TABLE IF NOT EXISTS auth_tokens (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  secret_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_tokens_user_kind_idx ON auth_tokens (user_id, kind);
CREATE INDEX IF NOT EXISTS auth_tokens_secret_hash_idx ON auth_tokens (secret_hash);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id text PRIMARY KEY,
  actor_id text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_name text NOT NULL,
  action text NOT NULL,
  target_user_id text,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_actor_idx ON admin_audit_log (actor_id);
CREATE INDEX IF NOT EXISTS admin_audit_target_idx ON admin_audit_log (target_user_id);
CREATE INDEX IF NOT EXISTS admin_audit_created_idx ON admin_audit_log (created_at);

CREATE TABLE IF NOT EXISTS referrals (
  id text PRIMARY KEY,
  referrer_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id text NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  qualified boolean NOT NULL DEFAULT false,
  bonus_ngn numeric(20, 2) NOT NULL DEFAULT 200,
  qualified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals (referrer_id);
CREATE INDEX IF NOT EXISTS referrals_referred_user_idx ON referrals (referred_user_id);

CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  tx_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications (user_id);

ALTER TABLE auth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_auth_tokens" ON auth_tokens;
CREATE POLICY "anon_select_auth_tokens" ON auth_tokens FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_auth_tokens" ON auth_tokens;
CREATE POLICY "anon_insert_auth_tokens" ON auth_tokens FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_auth_tokens" ON auth_tokens;
CREATE POLICY "anon_update_auth_tokens" ON auth_tokens FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_auth_tokens" ON auth_tokens;
CREATE POLICY "anon_delete_auth_tokens" ON auth_tokens FOR DELETE
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_admin_audit_log" ON admin_audit_log;
CREATE POLICY "anon_select_admin_audit_log" ON admin_audit_log FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_admin_audit_log" ON admin_audit_log;
CREATE POLICY "anon_insert_admin_audit_log" ON admin_audit_log FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_admin_audit_log" ON admin_audit_log;
CREATE POLICY "anon_update_admin_audit_log" ON admin_audit_log FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_admin_audit_log" ON admin_audit_log;
CREATE POLICY "anon_delete_admin_audit_log" ON admin_audit_log FOR DELETE
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_referrals" ON referrals;
CREATE POLICY "anon_select_referrals" ON referrals FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_referrals" ON referrals;
CREATE POLICY "anon_insert_referrals" ON referrals FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_referrals" ON referrals;
CREATE POLICY "anon_update_referrals" ON referrals FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_referrals" ON referrals;
CREATE POLICY "anon_delete_referrals" ON referrals FOR DELETE
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_notifications" ON notifications;
CREATE POLICY "anon_select_notifications" ON notifications FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_notifications" ON notifications;
CREATE POLICY "anon_insert_notifications" ON notifications FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_notifications" ON notifications;
CREATE POLICY "anon_update_notifications" ON notifications FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_notifications" ON notifications;
CREATE POLICY "anon_delete_notifications" ON notifications FOR DELETE
  TO anon, authenticated USING (true);