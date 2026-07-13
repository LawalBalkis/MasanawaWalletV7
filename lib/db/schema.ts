// ---------------------------------------------------------------------------
// Masanawa Wallet — Drizzle schema (single source of truth for the database).
//
// Portable by design: no integration is required to develop against this.
// Apply it to ANY Postgres database with one command:
//
//   DATABASE_URL=postgres://... pnpm db:migrate
//
// Migrations are generated offline (`pnpm db:generate`) and committed to the
// repo under /drizzle. The app automatically uses Postgres when DATABASE_URL
// is set, and an in-memory store otherwise (see lib/wallet/store.ts).
// ---------------------------------------------------------------------------
import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    username: text('username').notNull().unique(),
    email: text('email').notNull().unique(),
    phone: text('phone'),
    passwordHash: text('password_hash').notNull(),
    /** Scrypt hash of the 4-digit transaction PIN. Null until set. */
    pinHash: text('pin_hash'),
    /** KYC verification tier: 1, 2 or 3 (see lib/wallet/tiers.ts). */
    tier: integer('tier').notNull().default(1),
    /** Deterministic Billstack reserved-account reference for this user. */
    billstackRef: text('billstack_ref').notNull().unique(),
    // KYC data captured on tier upgrades.
    kycAddress: text('kyc_address'),
    kycIdType: text('kyc_id_type'),
    kycIdNumber: text('kyc_id_number'),
    // Preferences.
    notifyTransactions: boolean('notify_transactions').notNull().default(true),
    notifyPrices: boolean('notify_prices').notNull().default(false),
    notifyProduct: boolean('notify_product').notNull().default(true),
    twoFactor: boolean('two_factor').notNull().default(false),
    biometric: boolean('biometric').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('users_billstack_ref_idx').on(t.billstackRef)],
)

export const sessions = pgTable(
  'sessions',
  {
    /** SHA-256 hash of the raw session token (raw token lives only in the cookie). */
    tokenHash: text('token_hash').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('sessions_user_id_idx').on(t.userId)],
)

/**
 * The wallet ledger. Every balance in the app is derived from these rows —
 * there is no separate "balances" table to drift out of sync.
 * Balance rules live in lib/wallet/ledger.ts.
 */
export const transactions = pgTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** fund | buy | sell | send | receive | withdraw */
    type: text('type').notNull(),
    /** NGN | USDT | USDC | BTC | ETH | SOL */
    asset: text('asset').notNull(),
    /** Amount in the asset's own unit. Positive = in, negative = out. */
    amount: numeric('amount', { precision: 38, scale: 18, mode: 'number' }).notNull(),
    /** NGN value of the transaction at execution time. */
    ngnValue: numeric('ngn_value', { precision: 20, scale: 2, mode: 'number' }).notNull(),
    /** Fee charged in NGN (informational; already included in amount/ngnValue). */
    feeNgn: numeric('fee_ngn', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
    counterparty: text('counterparty'),
    note: text('note'),
    status: text('status').notNull().default('completed'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('transactions_user_created_idx').on(t.userId, t.createdAt)],
)

/** Payments credited into virtual accounts via the Billstack webhook (idempotency log). */
export const fundings = pgTable(
  'fundings',
  {
    /** Interbank transaction reference — unique per payment. */
    transactionRef: text('transaction_ref').primaryKey(),
    /** The Billstack reserved-account reference the payment came into. */
    accountReference: text('account_reference').notNull(),
    amount: numeric('amount', { precision: 20, scale: 2, mode: 'number' }).notNull(),
    payerName: text('payer_name').notNull(),
    payerAccountNumber: text('payer_account_number').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('fundings_account_reference_idx').on(t.accountReference)],
)

export const beneficiaries = pgTable(
  'beneficiaries',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    bank: text('bank').notNull(),
    accountNumber: text('account_number').notNull(),
    accountName: text('account_name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('beneficiaries_user_id_idx').on(t.userId)],
)

export const notifications = pgTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    body: text('body').notNull(),
    read: boolean('read').notNull().default(false),
    /** Optional link to a transactions.id row. */
    txId: text('tx_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('notifications_user_id_idx').on(t.userId)],
)
