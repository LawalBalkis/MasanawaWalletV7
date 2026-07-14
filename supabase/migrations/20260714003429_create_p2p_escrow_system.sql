/*
# P2P Escrow System + MSN Migration Support

1. New Tables
- `p2p_offers`: Maker-posted trade offers (buy/sell crypto for MSN)
- `p2p_orders`: Taker-opened orders against offers
- `escrow_holds`: Custodied assets locked during trade
- `p2p_order_messages`: In-order chat for communication/disputes
- `p2p_disputes`: Dispute records for admin resolution

2. Security
- RLS enabled on all tables. Uses anon, authenticated (custom session management, not Supabase Auth).

3. Indexes
- Foreign keys, status, and asset columns indexed.
*/

-- P2P Offers
CREATE TABLE IF NOT EXISTS p2p_offers (
  id text PRIMARY KEY,
  maker_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  side text NOT NULL CHECK (side IN ('buy', 'sell')),
  asset text NOT NULL,
  price_msn numeric(20, 2) NOT NULL,
  total_amount numeric(38, 18) NOT NULL,
  remaining_amount numeric(38, 18) NOT NULL,
  min_order_msn numeric(20, 2) NOT NULL DEFAULT 0,
  max_order_msn numeric(20, 2) NOT NULL DEFAULT 0,
  terms text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE p2p_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_offers" ON p2p_offers;
CREATE POLICY "select_offers" ON p2p_offers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_offers" ON p2p_offers;
CREATE POLICY "insert_offers" ON p2p_offers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_offers" ON p2p_offers;
CREATE POLICY "update_offers" ON p2p_offers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_offers" ON p2p_offers;
CREATE POLICY "delete_offers" ON p2p_offers FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS p2p_offers_maker_id_idx ON p2p_offers(maker_id);
CREATE INDEX IF NOT EXISTS p2p_offers_status_idx ON p2p_offers(status);
CREATE INDEX IF NOT EXISTS p2p_offers_asset_idx ON p2p_offers(asset);

-- P2P Orders
CREATE TABLE IF NOT EXISTS p2p_orders (
  id text PRIMARY KEY,
  offer_id text NOT NULL REFERENCES p2p_offers(id) ON DELETE CASCADE,
  maker_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  taker_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset text NOT NULL,
  amount numeric(38, 18) NOT NULL,
  price_msn numeric(20, 2) NOT NULL,
  total_msn numeric(20, 2) NOT NULL,
  fee_msn numeric(20, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'completed', 'cancelled', 'disputed')),
  escrow_hold_id text,
  expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE p2p_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_orders" ON p2p_orders;
CREATE POLICY "select_orders" ON p2p_orders FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_orders" ON p2p_orders;
CREATE POLICY "insert_orders" ON p2p_orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_orders" ON p2p_orders;
CREATE POLICY "update_orders" ON p2p_orders FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS p2p_orders_offer_id_idx ON p2p_orders(offer_id);
CREATE INDEX IF NOT EXISTS p2p_orders_taker_id_idx ON p2p_orders(taker_id);
CREATE INDEX IF NOT EXISTS p2p_orders_maker_id_idx ON p2p_orders(maker_id);
CREATE INDEX IF NOT EXISTS p2p_orders_status_idx ON p2p_orders(status);

-- Escrow Holds
CREATE TABLE IF NOT EXISTS escrow_holds (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES p2p_orders(id) ON DELETE CASCADE,
  owner_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset text NOT NULL,
  amount numeric(38, 18) NOT NULL,
  status text NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'released', 'refunded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE escrow_holds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_escrow" ON escrow_holds;
CREATE POLICY "select_escrow" ON escrow_holds FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_escrow" ON escrow_holds;
CREATE POLICY "insert_escrow" ON escrow_holds FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_escrow" ON escrow_holds;
CREATE POLICY "update_escrow" ON escrow_holds FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS escrow_holds_order_id_idx ON escrow_holds(order_id);
CREATE INDEX IF NOT EXISTS escrow_holds_owner_id_idx ON escrow_holds(owner_id);
CREATE INDEX IF NOT EXISTS escrow_holds_status_idx ON escrow_holds(status);

-- P2P Order Messages (chat)
CREATE TABLE IF NOT EXISTS p2p_order_messages (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES p2p_orders(id) ON DELETE CASCADE,
  sender_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE p2p_order_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_messages" ON p2p_order_messages;
CREATE POLICY "select_messages" ON p2p_order_messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_messages" ON p2p_order_messages;
CREATE POLICY "insert_messages" ON p2p_order_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS p2p_order_messages_order_id_idx ON p2p_order_messages(order_id);

-- P2P Disputes
CREATE TABLE IF NOT EXISTS p2p_disputes (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES p2p_orders(id) ON DELETE CASCADE,
  opened_by_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  evidence jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved_release', 'resolved_refund')),
  resolved_by_id text REFERENCES users(id) ON DELETE SET NULL,
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE p2p_disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_disputes" ON p2p_disputes;
CREATE POLICY "select_disputes" ON p2p_disputes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_disputes" ON p2p_disputes;
CREATE POLICY "insert_disputes" ON p2p_disputes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_disputes" ON p2p_disputes;
CREATE POLICY "update_disputes" ON p2p_disputes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS p2p_disputes_order_id_idx ON p2p_disputes(order_id);
CREATE INDEX IF NOT EXISTS p2p_disputes_status_idx ON p2p_disputes(status);
