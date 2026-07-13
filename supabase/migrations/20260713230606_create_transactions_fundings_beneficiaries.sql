/*
# Create transactions, fundings, and beneficiaries tables

1. New Tables
- `transactions`: Wallet ledger — all balances derived from these rows.
- `fundings`: Billstack webhook payment log (idempotent).
- `beneficiaries`: Saved bank accounts for withdrawals.

2. Security
- RLS enabled on all tables with anon, authenticated access (app manages auth in server actions).
*/

CREATE TABLE IF NOT EXISTS transactions (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  asset text NOT NULL,
  amount numeric(38, 18) NOT NULL,
  ngn_value numeric(20, 2) NOT NULL,
  fee_ngn numeric(20, 2) NOT NULL DEFAULT 0,
  counterparty text,
  note text,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transactions_user_created_idx ON transactions (user_id, created_at);

CREATE TABLE IF NOT EXISTS fundings (
  transaction_ref text PRIMARY KEY,
  account_reference text NOT NULL,
  amount numeric(20, 2) NOT NULL,
  payer_name text NOT NULL,
  payer_account_number text NOT NULL,
  received_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS fundings_account_reference_idx ON fundings (account_reference);

CREATE TABLE IF NOT EXISTS beneficiaries (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS beneficiaries_user_id_idx ON beneficiaries (user_id);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fundings ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_transactions" ON transactions;
CREATE POLICY "anon_select_transactions" ON transactions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_transactions" ON transactions;
CREATE POLICY "anon_insert_transactions" ON transactions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_transactions" ON transactions;
CREATE POLICY "anon_update_transactions" ON transactions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_transactions" ON transactions;
CREATE POLICY "anon_delete_transactions" ON transactions FOR DELETE
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_fundings" ON fundings;
CREATE POLICY "anon_select_fundings" ON fundings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_fundings" ON fundings;
CREATE POLICY "anon_insert_fundings" ON fundings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_fundings" ON fundings;
CREATE POLICY "anon_update_fundings" ON fundings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_fundings" ON fundings;
CREATE POLICY "anon_delete_fundings" ON fundings FOR DELETE
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_beneficiaries" ON beneficiaries;
CREATE POLICY "anon_select_beneficiaries" ON beneficiaries FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_beneficiaries" ON beneficiaries;
CREATE POLICY "anon_insert_beneficiaries" ON beneficiaries FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_beneficiaries" ON beneficiaries;
CREATE POLICY "anon_update_beneficiaries" ON beneficiaries FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_beneficiaries" ON beneficiaries;
CREATE POLICY "anon_delete_beneficiaries" ON beneficiaries FOR DELETE
  TO anon, authenticated USING (true);