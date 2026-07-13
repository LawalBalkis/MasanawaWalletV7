/*
# Create rate_limits table for Postgres-backed rate limiting (Phase A5)

1. New Tables
- `rate_limits`: Sliding-window rate limiting backed by Postgres, replacing the in-memory implementation.
  - key: rate-limit key (e.g. "signin:ip:1.2.3.4")
  - count: number of attempts in current window
  - window_start: start of current window
  - updated_at: last update timestamp

2. Security
- RLS enabled with anon, authenticated access (app manages rate limiting in server actions).
*/

CREATE TABLE IF NOT EXISTS rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_rate_limits" ON rate_limits;
CREATE POLICY "anon_select_rate_limits" ON rate_limits FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_rate_limits" ON rate_limits;
CREATE POLICY "anon_insert_rate_limits" ON rate_limits FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_rate_limits" ON rate_limits;
CREATE POLICY "anon_update_rate_limits" ON rate_limits FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_rate_limits" ON rate_limits;
CREATE POLICY "anon_delete_rate_limits" ON rate_limits FOR DELETE
  TO anon, authenticated USING (true);