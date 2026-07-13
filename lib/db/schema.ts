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
    /** Whether the user has confirmed their email via the OTP flow. */
    emailVerified: boolean('email_verified').notNull().default(false),
    /** Scrypt hash of the 4-digit transaction PIN. Null until set. */
    pinHash: text('pin_hash'),
    /** KYC verification tier: 1, 2 or 3 (see lib/wallet/tiers.ts). */
    tier: integer('tier').notNull().default(1),
    /** Access role: 'user' | 'admin'. Admins reach the /admin console. */
    role: text('role').notNull().default('user'),
    /** Account status: 'active' | 'frozen'. Frozen users cannot move money. */
    status: text('status').notNull().default('active'),
    /** Deterministic Billstack reserved-account reference for this user. */
    billstackRef: text('billstack_ref').notNull().unique(),
    // KYC data captured on tier upgrades.
    kycAddress: text('kyc_address'),
    kycIdType: text('kyc_id_type'),
    kycIdNumber: text('kyc_id_number'),
    /** The user id of whoever referred this user, if any. */
    referredBy: text('referred_by'),
    /** NGN already moved from the referral balance into the wallet. */
    referralWithdrawn: numeric('referral_withdrawn', { precision: 20, scale: 2, mode: 'number' })
      .notNull()
      .default(0),
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

/**
 * Short-lived, single-use tokens for email verification (6-digit OTP) and
 * password resets. Only a SHA-256 hash of the secret is stored — the raw
 * code/token is delivered to the user by email and never persisted.
 */
export const authTokens = pgTable(
  'auth_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** 'email_verify' | 'password_reset' */
    kind: text('kind').notNull(),
    /** SHA-256 hash of the OTP code or reset token. */
    secretHash: text('secret_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('auth_tokens_user_kind_idx').on(t.userId, t.kind),
    index('auth_tokens_secret_hash_idx').on(t.secretHash),
  ],
)

/**
 * Immutable log of privileged admin actions (freeze, tier change, PIN reset,
 * manual credit/debit, ...). Append-only — used for compliance and dispute
 * resolution. `detail` is a JSON string with action-specific context.
 */
export const adminAuditLog = pgTable(
  'admin_audit_log',
  {
    id: text('id').primaryKey(),
    actorId: text('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    /** Denormalised actor name so the log survives even if the user changes it. */
    actorName: text('actor_name').notNull(),
    /** Machine action code, e.g. 'user.freeze', 'user.credit'. */
    action: text('action').notNull(),
    /** The user the action targeted, if any. */
    targetUserId: text('target_user_id'),
    /** JSON string with action-specific context (amounts, reasons, before/after). */
    detail: text('detail'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('admin_audit_actor_idx').on(t.actorId),
    index('admin_audit_target_idx').on(t.targetUserId),
    index('admin_audit_created_idx').on(t.createdAt),
  ],
)

/**
 * Referral relationships. One row per invited user, created at sign-up when a
 * valid referral code is supplied. A referral "qualifies" once the invited
 * user's cumulative funding reaches the threshold — at which point the referrer
 * earns a fixed bonus into their (separate) referral balance.
 */
export const referrals = pgTable(
  'referrals',
  {
    id: text('id').primaryKey(),
    /** The user who invited (earns the bonus). */
    referrerId: text('referrer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** The invited user. One referral per invited user. */
    referredUserId: text('referred_user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Whether the referred user's funding crossed the qualification threshold. */
    qualified: boolean('qualified').notNull().default(false),
    /** Fixed NGN bonus the referrer earns once this referral qualifies. */
    bonusNgn: numeric('bonus_ngn', { precision: 20, scale: 2, mode: 'number' }).notNull().default(200),
    qualifiedAt: timestamp('qualified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('referrals_referrer_idx').on(t.referrerId),
    index('referrals_referred_user_idx').on(t.referredUserId),
  ],
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
