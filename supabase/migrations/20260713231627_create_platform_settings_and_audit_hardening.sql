/*
# Phase B: Platform settings table + admin audit log hardening

1. New Tables
- `platform_settings`: Key/value JSON store for runtime-tunable fees, limits, referral config.

2. Altered Tables
- `admin_audit_log`: Add `ip` and `user_agent` columns for forensic completeness.

3. Security
- RLS enabled on platform_settings with anon, authenticated access.
*/

CREATE TABLE IF NOT EXISTS platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by text REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_platform_settings" ON platform_settings;
CREATE POLICY "anon_select_platform_settings" ON platform_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_platform_settings" ON platform_settings;
CREATE POLICY "anon_insert_platform_settings" ON platform_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_platform_settings" ON platform_settings;
CREATE POLICY "anon_update_platform_settings" ON platform_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_platform_settings" ON platform_settings;
CREATE POLICY "anon_delete_platform_settings" ON platform_settings FOR DELETE
  TO anon, authenticated USING (true);

-- Add ip and user_agent columns to admin_audit_log (safe: additive)
ALTER TABLE admin_audit_log ADD COLUMN IF NOT EXISTS ip text;
ALTER TABLE admin_audit_log ADD COLUMN IF NOT EXISTS user_agent text;