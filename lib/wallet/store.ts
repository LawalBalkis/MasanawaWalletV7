// ---------------------------------------------------------------------------
// WalletStore — the single persistence boundary for ALL wallet data:
// users, sessions, the transaction ledger, fundings, beneficiaries and
// notifications.
//
// Two interchangeable backends implement the same interface:
//   • InMemoryWalletStore  — default. Zero setup, seeded with demo accounts.
//   • DrizzleWalletStore   — used automatically when DATABASE_URL is set.
//                            Schema lives in lib/db/schema.ts; apply it to any
//                            Postgres with `pnpm db:migrate`.
//
// Nothing outside this boundary knows which backend is active.
// ---------------------------------------------------------------------------
import 'server-only'

import { hashSecret } from '@/lib/auth/crypto'
import type { AssetSymbol, Beneficiary, WalletNotification, WalletTx } from './assets'
import { DrizzleWalletStore } from './drizzle-store'
import { FALLBACK_NGN_RATES } from './assets'
import { computeBalances, type Balances } from './ledger'
import type { TierId } from './tiers'

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export type UserRole = 'user' | 'admin'
export type UserStatus = 'active' | 'frozen'

export interface UserRecord {
  id: string
  name: string
  username: string
  email: string
  phone: string | null
  passwordHash: string
  emailVerified: boolean
  pinHash: string | null
  tier: TierId
  role: UserRole
  status: UserStatus
  billstackRef: string
  kycAddress: string | null
  kycIdType: string | null
  kycIdNumber: string | null
  referredBy: string | null
  referralWithdrawn: number
  notifyTransactions: boolean
  notifyPrices: boolean
  notifyProduct: boolean
  twoFactor: boolean
  biometric: boolean
  createdAt: string
}

export interface NewUser {
  id: string
  name: string
  username: string
  email: string
  phone?: string | null
  passwordHash: string
  billstackRef: string
}

export type UserPatch = Partial<
  Pick<
    UserRecord,
    | 'name'
    | 'email'
    | 'phone'
    | 'passwordHash'
    | 'emailVerified'
    | 'pinHash'
    | 'tier'
    | 'role'
    | 'status'
    | 'kycAddress'
    | 'kycIdType'
    | 'kycIdNumber'
    | 'notifyTransactions'
    | 'notifyPrices'
    | 'notifyProduct'
    | 'twoFactor'
    | 'biometric'
  >
>

export interface SessionRecord {
  tokenHash: string
  userId: string
  /** ISO timestamp. */
  expiresAt: string
}

/** A ledger row: a WalletTx owned by a user. */
export type LedgerTx = WalletTx & { userId: string }

export type NotificationInput = {
  userId: string
  title: string
  body: string
  txId?: string
}

/** A recorded wallet funding (a payment into the user's virtual account). */
export interface FundingRecord {
  /** Interbank reference — unique per payment, used for idempotency. */
  transactionRef: string
  /** The virtual account merchant reference the payment came into. */
  accountReference: string
  /** Amount in NGN. */
  amount: number
  payerName: string
  payerAccountNumber: string
  receivedAt: string
}

/**
 * Details needed to credit a user's NGN balance when a funding is newly
 * recorded. Passed alongside the FundingRecord so the idempotency log and the
 * ledger credit are written atomically — a funding can never be logged without
 * its matching ledger row (which would silently swallow a customer's money).
 */
export interface FundingCredit {
  /** The user who owns the virtual account. */
  userId: string
  /** Ledger transaction id to create. Deterministic for dedupe safety. */
  txId: string
  /** Optional note for the ledger row / notification. */
  note?: string
}

export type AuthTokenKind = 'email_verify' | 'password_reset'

/**
 * A short-lived, single-use auth token (email OTP or password reset). Only the
 * SHA-256 hash of the secret is stored; the raw value is emailed to the user.
 */
export interface AuthTokenRecord {
  id: string
  userId: string
  kind: AuthTokenKind
  secretHash: string
  /** ISO timestamp. */
  expiresAt: string
  attempts: number
}

/** A ledger row with the owning user's identity, for admin oversight views. */
export type AdminLedgerTx = LedgerTx & { username: string; userName: string }

/** A platform-wide funding row with the owning user attached (may be null). */
export type AdminFunding = FundingRecord & {
  userId: string | null
  username: string | null
}

/** Options for paginated/searchable admin user listing. */
export interface UserListOptions {
  search?: string
  limit?: number
  offset?: number
}

/** Aggregate platform metrics for the admin overview. */
export interface PlatformStats {
  totalUsers: number
  frozenUsers: number
  adminUsers: number
  totalTransactions: number
  totalFundings: number
  totalFundedNgn: number
  tierCounts: Record<TierId, number>
}

/** An append-only admin audit entry. */
export interface AdminAuditEntry {
  id: string
  actorId: string
  actorName: string
  action: string
  targetUserId: string | null
  detail: string | null
  createdAt: string
}

export type NewAuditEntry = {
  actorId: string
  actorName: string
  action: string
  targetUserId?: string | null
  detail?: string | null
}

/** A single referral relationship (one invited user). */
export interface ReferralRecord {
  id: string
  referrerId: string
  referredUserId: string
  qualified: boolean
  bonusNgn: number
  qualifiedAt: string | null
  createdAt: string
}

/** One row in a referrer's list of the people they invited. */
export interface ReferralListItem {
  referredUserId: string
  referredName: string
  referredUsername: string
  qualified: boolean
  bonusNgn: number
  joinedAt: string
}

/** Aggregate referral figures for a referrer's dashboard. */
export interface ReferralStats {
  /** Total people who signed up with this user's code. */
  total: number
  /** How many have crossed the funding threshold. */
  qualified: number
  /** Signed up but not yet qualified. */
  pending: number
  /** Total NGN earned (qualified × bonus). */
  earnedNgn: number
  /** NGN already moved into the wallet. */
  withdrawnNgn: number
  /** NGN currently available to withdraw. */
  availableNgn: number
  referrals: ReferralListItem[]
}

// ---------------------------------------------------------------------------
// The store contract
// ---------------------------------------------------------------------------

export interface WalletStore {
  // Users
  createUser(user: NewUser): Promise<UserRecord>
  getUserById(id: string): Promise<UserRecord | null>
  getUserByEmail(email: string): Promise<UserRecord | null>
  getUserByUsername(username: string): Promise<UserRecord | null>
  getUserByBillstackRef(ref: string): Promise<UserRecord | null>
  updateUser(id: string, patch: UserPatch): Promise<UserRecord | null>

  // Sessions
  createSession(session: SessionRecord): Promise<void>
  getSession(tokenHash: string): Promise<SessionRecord | null>
  deleteSession(tokenHash: string): Promise<void>

  // Auth tokens (email OTP + password reset)
  createAuthToken(token: AuthTokenRecord): Promise<void>
  getLatestAuthToken(userId: string, kind: AuthTokenKind): Promise<AuthTokenRecord | null>
  getAuthTokenBySecret(secretHash: string, kind: AuthTokenKind): Promise<AuthTokenRecord | null>
  incrementAuthTokenAttempts(id: string): Promise<number>
  deleteAuthToken(id: string): Promise<void>
  deleteAuthTokensForUser(userId: string, kind: AuthTokenKind): Promise<void>

  // Ledger (balances are always derived from these rows)
  addTransactions(txs: LedgerTx[]): Promise<void>
  listTransactions(userId: string, limit?: number): Promise<WalletTx[]>
  getTransaction(userId: string, id: string): Promise<WalletTx | null>
  getBalances(userId: string): Promise<Balances>

  // Fundings (Billstack webhook idempotency log + atomic NGN credit)
  recordFunding(record: FundingRecord, credit: FundingCredit): Promise<boolean>
  hasFunding(transactionRef: string): Promise<boolean>
  listFundings(accountReference: string): Promise<FundingRecord[]>
  getFundedTotal(accountReference: string): Promise<number>

  // Referrals
  recordReferral(referrerId: string, referredUserId: string, bonusNgn: number): Promise<void>
  getReferralForUser(referredUserId: string): Promise<ReferralRecord | null>
  qualifyReferral(referredUserId: string): Promise<ReferralRecord | null>
  getReferralStats(referrerId: string): Promise<ReferralStats>
  withdrawReferralEarnings(userId: string, amount: number, txId: string): Promise<boolean>

  // Beneficiaries
  listBeneficiaries(userId: string): Promise<Beneficiary[]>
  addBeneficiary(userId: string, b: Omit<Beneficiary, 'id'>): Promise<Beneficiary>
  removeBeneficiary(userId: string, id: string): Promise<void>

  // Notifications
  listNotifications(userId: string): Promise<WalletNotification[]>
  addNotification(input: NotificationInput): Promise<void>
  markNotificationRead(userId: string, id: string): Promise<void>
  markAllNotificationsRead(userId: string): Promise<void>
  getUnreadCount(userId: string): Promise<number>

  // Admin — user directory, oversight and audit trail
  listUsers(opts?: UserListOptions): Promise<UserRecord[]>
  countUsers(search?: string): Promise<number>
  listAllTransactions(opts?: { limit?: number; offset?: number }): Promise<AdminLedgerTx[]>
  listAllFundings(opts?: { limit?: number; offset?: number }): Promise<AdminFunding[]>
  getPlatformStats(): Promise<PlatformStats>
  addAuditLog(entry: NewAuditEntry): Promise<void>
  listAuditLog(opts?: { limit?: number; targetUserId?: string }): Promise<AdminAuditEntry[]>
}

// ---------------------------------------------------------------------------
// Deterministic Billstack reference for a user. Stable across calls so
// reserved accounts are always recovered, never duplicated.
// ---------------------------------------------------------------------------

export function billstackReferenceForUser(userId: string): string {
  const clean = userId.toLowerCase().replace(/[^a-z0-9]/g, '_')
  return `masanawa_${clean}`
}

// ---------------------------------------------------------------------------
// In-memory implementation (default when DATABASE_URL is not set).
// Seeded with demo accounts so the app is fully usable out of the box:
//   demo@masanawa.app / password123 · PIN 1234 (@adaeze)
// ---------------------------------------------------------------------------

interface MemoryState {
  users: Map<string, UserRecord>
  sessions: Map<string, SessionRecord>
  authTokens: Map<string, AuthTokenRecord>
  transactions: LedgerTx[]
  fundings: Map<string, FundingRecord>
  /** Keyed by referredUserId — one referral per invited user. */
  referrals: Map<string, ReferralRecord>
  beneficiaries: Map<string, Beneficiary & { userId: string }>
  notifications: Map<string, WalletNotification & { userId: string }>
  auditLog: AdminAuditEntry[]
  counter: number
}

function seedState(): MemoryState {
  const state: MemoryState = {
    users: new Map(),
    sessions: new Map(),
    authTokens: new Map(),
    transactions: [],
    fundings: new Map(),
    referrals: new Map(),
    beneficiaries: new Map(),
    notifications: new Map(),
    auditLog: [],
    counter: 0,
  }

  const passwordHash = hashSecret('password123')
  const pinHash = hashSecret('1234')
  const seededAt = new Date(Date.now() - 30 * 86400000).toISOString()

  const mkUser = (id: string, name: string, email: string): UserRecord => ({
    id,
    name,
    username: id,
    email,
    phone: null,
    passwordHash,
    emailVerified: true,
    pinHash,
    tier: 1,
    role: 'user',
    status: 'active',
    billstackRef: billstackReferenceForUser(id),
    kycAddress: null,
    kycIdType: null,
    kycIdNumber: null,
    referredBy: null,
    referralWithdrawn: 0,
    notifyTransactions: true,
    notifyPrices: false,
    notifyProduct: true,
    twoFactor: false,
    biometric: false,
    createdAt: seededAt,
  })

  const demo = mkUser('adaeze', 'Adaeze Okafor', 'demo@masanawa.app')
  demo.phone = '+234 803 555 0142'
  state.users.set(demo.id, demo)

  // Seeded platform administrator: admin@masanawa.app / password123 · PIN 1234
  const admin = mkUser('admin', 'Platform Admin', 'admin@masanawa.app')
  admin.role = 'admin'
  admin.tier = 3
  state.users.set(admin.id, admin)

  const directory: [string, string][] = [
    ['chinedu', 'Chinedu Eze'],
    ['femi', 'Femi Adeyemi'],
    ['amaka', 'Amaka Nwosu'],
    ['tunde', 'Tunde Bakare'],
    ['zainab', 'Zainab Bello'],
    ['emeka', 'Emeka Obi'],
  ]
  for (const [id, name] of directory) {
    state.users.set(id, mkUser(id, name, `${id}@masanawa.app`))
  }

  // Opening ledger entries — demo balances derive from these rows.
  const openings: [string, AssetSymbol, number][] = [
    ['adaeze', 'NGN', 486_250],
    ['adaeze', 'USDT', 342.18],
    ['adaeze', 'USDC', 120.5],
    ['adaeze', 'BTC', 0.0042],
    ['adaeze', 'ETH', 0.085],
    ['adaeze', 'SOL', 3.4],
    ...directory.map(([id]): [string, AssetSymbol, number] => [id, 'NGN', 250_000]),
    ...directory.map(([id]): [string, AssetSymbol, number] => [id, 'USDT', 100]),
  ]
  for (const [userId, asset, amount] of openings) {
    state.counter += 1
    state.transactions.push({
      id: `tx_seed_${String(state.counter).padStart(3, '0')}`,
      userId,
      type: asset === 'NGN' ? 'fund' : 'receive',
      asset,
      amount,
      ngnValue: Math.round(amount * FALLBACK_NGN_RATES[asset] * 100) / 100,
      note: 'Opening balance',
      status: 'completed',
      date: seededAt,
    })
  }

  for (const b of [
    { id: 'ben_01', userId: 'adaeze', bank: 'GTBank', accountNumber: '0122334521', accountName: 'Adaeze Okafor' },
    { id: 'ben_02', userId: 'adaeze', bank: 'Kuda', accountNumber: '2003456789', accountName: 'Adaeze Okafor' },
  ]) {
    state.beneficiaries.set(b.id, b)
  }

  state.notifications.set('nt_seed_01', {
    id: 'nt_seed_01',
    userId: 'adaeze',
    title: 'Welcome to Masanawa',
    body: 'Fund your NGN wallet, trade crypto, and send money to any @username — all from your dashboard.',
    date: seededAt,
    read: false,
  })

  return state
}

// Survive HMR in development by stashing state on globalThis.
const globalStore = globalThis as unknown as { __masanawaMemoryState?: MemoryState }

function getState(): MemoryState {
  if (!globalStore.__masanawaMemoryState) {
    globalStore.__masanawaMemoryState = seedState()
  }
  return globalStore.__masanawaMemoryState
}

class InMemoryWalletStore implements WalletStore {
  async createUser(user: NewUser): Promise<UserRecord> {
    const s = getState()
    const record: UserRecord = {
      ...user,
      phone: user.phone ?? null,
      emailVerified: false,
      pinHash: null,
      tier: 1,
      role: 'user',
      status: 'active',
      kycAddress: null,
      kycIdType: null,
      kycIdNumber: null,
      referredBy: null,
      referralWithdrawn: 0,
      notifyTransactions: true,
      notifyPrices: false,
      notifyProduct: true,
      twoFactor: false,
      biometric: false,
      createdAt: new Date().toISOString(),
    }
    s.users.set(record.id, record)
    return record
  }

  async getUserById(id: string) {
    return getState().users.get(id) ?? null
  }

  async getUserByEmail(email: string) {
    const target = email.toLowerCase()
    for (const u of getState().users.values()) {
      if (u.email.toLowerCase() === target) return u
    }
    return null
  }

  async getUserByUsername(username: string) {
    const target = username.toLowerCase()
    for (const u of getState().users.values()) {
      if (u.username.toLowerCase() === target) return u
    }
    return null
  }

  async getUserByBillstackRef(ref: string) {
    for (const u of getState().users.values()) {
      if (u.billstackRef === ref) return u
    }
    return null
  }

  async updateUser(id: string, patch: UserPatch) {
    const s = getState()
    const user = s.users.get(id)
    if (!user) return null
    const updated = { ...user, ...patch }
    s.users.set(id, updated)
    return updated
  }

  async createSession(session: SessionRecord) {
    getState().sessions.set(session.tokenHash, session)
  }

  async getSession(tokenHash: string) {
    const session = getState().sessions.get(tokenHash) ?? null
    if (session && new Date(session.expiresAt) < new Date()) {
      getState().sessions.delete(tokenHash)
      return null
    }
    return session
  }

  async deleteSession(tokenHash: string) {
    getState().sessions.delete(tokenHash)
  }

  async createAuthToken(token: AuthTokenRecord) {
    getState().authTokens.set(token.id, token)
  }

  async getLatestAuthToken(userId: string, kind: AuthTokenKind) {
    let latest: AuthTokenRecord | null = null
    for (const t of getState().authTokens.values()) {
      if (t.userId === userId && t.kind === kind) {
        if (!latest || t.expiresAt > latest.expiresAt) latest = t
      }
    }
    return latest
  }

  async getAuthTokenBySecret(secretHash: string, kind: AuthTokenKind) {
    for (const t of getState().authTokens.values()) {
      if (t.secretHash === secretHash && t.kind === kind) return t
    }
    return null
  }

  async incrementAuthTokenAttempts(id: string) {
    const s = getState()
    const t = s.authTokens.get(id)
    if (!t) return 0
    const updated = { ...t, attempts: t.attempts + 1 }
    s.authTokens.set(id, updated)
    return updated.attempts
  }

  async deleteAuthToken(id: string) {
    getState().authTokens.delete(id)
  }

  async deleteAuthTokensForUser(userId: string, kind: AuthTokenKind) {
    const s = getState()
    for (const [id, t] of s.authTokens) {
      if (t.userId === userId && t.kind === kind) s.authTokens.delete(id)
    }
  }

  async addTransactions(txs: LedgerTx[]) {
    getState().transactions.push(...txs)
  }

  async listTransactions(userId: string, limit?: number) {
    const txs = getState()
      .transactions.filter((t) => t.userId === userId)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(({ userId: _u, ...tx }) => tx)
    return limit ? txs.slice(0, limit) : txs
  }

  async getTransaction(userId: string, id: string) {
    const found = getState().transactions.find((t) => t.userId === userId && t.id === id)
    if (!found) return null
    const { userId: _u, ...tx } = found
    return tx
  }

  async getBalances(userId: string) {
    return computeBalances(await this.listTransactions(userId))
  }

  async recordFunding(record: FundingRecord, credit: FundingCredit) {
    const s = getState()
    if (s.fundings.has(record.transactionRef)) return false
    // Log the funding AND credit the ledger together — balances are derived
    // from ledger rows, so a funding without a 'fund' row would never appear.
    s.fundings.set(record.transactionRef, record)
    s.transactions.push({
      id: credit.txId,
      userId: credit.userId,
      type: 'fund',
      asset: 'NGN',
      amount: record.amount,
      ngnValue: record.amount,
      counterparty: record.payerName,
      note: credit.note ?? `Bank deposit from ${record.payerName}`,
      status: 'completed',
      date: record.receivedAt,
    })
    return true
  }

  async hasFunding(transactionRef: string) {
    return getState().fundings.has(transactionRef)
  }

  async listFundings(accountReference: string) {
    return [...getState().fundings.values()]
      .filter((f) => f.accountReference === accountReference)
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
  }

  async getFundedTotal(accountReference: string) {
    const fundings = await this.listFundings(accountReference)
    return fundings.reduce((sum, f) => sum + f.amount, 0)
  }

  async recordReferral(referrerId: string, referredUserId: string, bonusNgn: number) {
    const s = getState()
    if (s.referrals.has(referredUserId)) return
    s.counter += 1
    s.referrals.set(referredUserId, {
      id: `ref_${Date.now()}_${s.counter}`,
      referrerId,
      referredUserId,
      qualified: false,
      bonusNgn,
      qualifiedAt: null,
      createdAt: new Date().toISOString(),
    })
    const user = s.users.get(referredUserId)
    if (user) s.users.set(referredUserId, { ...user, referredBy: referrerId })
  }

  async getReferralForUser(referredUserId: string) {
    return getState().referrals.get(referredUserId) ?? null
  }

  async qualifyReferral(referredUserId: string) {
    const s = getState()
    const referral = s.referrals.get(referredUserId)
    if (!referral || referral.qualified) return null
    const updated: ReferralRecord = {
      ...referral,
      qualified: true,
      qualifiedAt: new Date().toISOString(),
    }
    s.referrals.set(referredUserId, updated)
    return updated
  }

  async getReferralStats(referrerId: string): Promise<ReferralStats> {
    const s = getState()
    const mine = [...s.referrals.values()]
      .filter((r) => r.referrerId === referrerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const referrer = s.users.get(referrerId)
    const withdrawnNgn = referrer?.referralWithdrawn ?? 0
    const qualified = mine.filter((r) => r.qualified)
    const earnedNgn = qualified.reduce((sum, r) => sum + r.bonusNgn, 0)
    const referrals: ReferralListItem[] = mine.map((r) => {
      const u = s.users.get(r.referredUserId)
      return {
        referredUserId: r.referredUserId,
        referredName: u?.name ?? 'Unknown',
        referredUsername: u?.username ?? r.referredUserId,
        qualified: r.qualified,
        bonusNgn: r.bonusNgn,
        joinedAt: r.createdAt,
      }
    })
    return {
      total: mine.length,
      qualified: qualified.length,
      pending: mine.length - qualified.length,
      earnedNgn,
      withdrawnNgn,
      availableNgn: Math.max(0, earnedNgn - withdrawnNgn),
      referrals,
    }
  }

  async withdrawReferralEarnings(userId: string, amount: number, txId: string) {
    const s = getState()
    const user = s.users.get(userId)
    if (!user) return false
    const qualified = [...s.referrals.values()].filter(
      (r) => r.referrerId === userId && r.qualified,
    )
    const earned = qualified.reduce((sum, r) => sum + r.bonusNgn, 0)
    const available = earned - user.referralWithdrawn
    if (amount <= 0 || amount > available) return false
    s.users.set(userId, { ...user, referralWithdrawn: user.referralWithdrawn + amount })
    s.transactions.push({
      id: txId,
      userId,
      type: 'receive',
      asset: 'NGN',
      amount,
      ngnValue: amount,
      counterparty: 'Masanawa Referrals',
      note: 'Referral earnings',
      status: 'completed',
      date: new Date().toISOString(),
    })
    return true
  }

  async listBeneficiaries(userId: string) {
    return [...getState().beneficiaries.values()]
      .filter((b) => b.userId === userId)
      .map(({ userId: _u, ...b }) => b)
  }

  async addBeneficiary(userId: string, b: Omit<Beneficiary, 'id'>) {
    const s = getState()
    for (const existing of s.beneficiaries.values()) {
      if (
        existing.userId === userId &&
        existing.bank === b.bank &&
        existing.accountNumber === b.accountNumber
      ) {
        const { userId: _u, ...rest } = existing
        return rest
      }
    }
    s.counter += 1
    const record = { id: `ben_${Date.now()}_${s.counter}`, userId, ...b }
    s.beneficiaries.set(record.id, record)
    const { userId: _u, ...rest } = record
    return rest
  }

  async removeBeneficiary(userId: string, id: string) {
    const s = getState()
    const found = s.beneficiaries.get(id)
    if (found && found.userId === userId) s.beneficiaries.delete(id)
  }

  async listNotifications(userId: string) {
    return [...getState().notifications.values()]
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(({ userId: _u, ...n }) => n)
  }

  async addNotification(input: NotificationInput) {
    const s = getState()
    s.counter += 1
    const id = `nt_${Date.now()}_${s.counter}`
    s.notifications.set(id, {
      id,
      userId: input.userId,
      title: input.title,
      body: input.body,
      txId: input.txId,
      date: new Date().toISOString(),
      read: false,
    })
  }

  async markNotificationRead(userId: string, id: string) {
    const s = getState()
    const n = s.notifications.get(id)
    if (n && n.userId === userId) s.notifications.set(id, { ...n, read: true })
  }

  async markAllNotificationsRead(userId: string) {
    const s = getState()
    for (const [id, n] of s.notifications) {
      if (n.userId === userId && !n.read) s.notifications.set(id, { ...n, read: true })
    }
  }

  async getUnreadCount(userId: string) {
    let count = 0
    for (const n of getState().notifications.values()) {
      if (n.userId === userId && !n.read) count += 1
    }
    return count
  }

  async listUsers(opts?: UserListOptions) {
    const search = opts?.search?.trim().toLowerCase()
    let all = [...getState().users.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (search) {
      all = all.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.username.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search),
      )
    }
    const offset = opts?.offset ?? 0
    const limit = opts?.limit ?? all.length
    return all.slice(offset, offset + limit)
  }

  async countUsers(search?: string) {
    return (await this.listUsers({ search })).length
  }

  async listAllTransactions(opts?: { limit?: number; offset?: number }) {
    const users = getState().users
    const all: AdminLedgerTx[] = getState()
      .transactions.slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((tx) => {
        const owner = users.get(tx.userId)
        return { ...tx, username: owner?.username ?? tx.userId, userName: owner?.name ?? 'Unknown' }
      })
    const offset = opts?.offset ?? 0
    const limit = opts?.limit ?? all.length
    return all.slice(offset, offset + limit)
  }

  async listAllFundings(opts?: { limit?: number; offset?: number }) {
    const users = [...getState().users.values()]
    const byRef = new Map(users.map((u) => [u.billstackRef, u]))
    const all: AdminFunding[] = [...getState().fundings.values()]
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
      .map((f) => {
        const owner = byRef.get(f.accountReference) ?? null
        return { ...f, userId: owner?.id ?? null, username: owner?.username ?? null }
      })
    const offset = opts?.offset ?? 0
    const limit = opts?.limit ?? all.length
    return all.slice(offset, offset + limit)
  }

  async getPlatformStats(): Promise<PlatformStats> {
    const users = [...getState().users.values()]
    const tierCounts: Record<TierId, number> = { 1: 0, 2: 0, 3: 0 }
    let frozenUsers = 0
    let adminUsers = 0
    for (const u of users) {
      tierCounts[u.tier] += 1
      if (u.status === 'frozen') frozenUsers += 1
      if (u.role === 'admin') adminUsers += 1
    }
    const fundings = [...getState().fundings.values()]
    return {
      totalUsers: users.length,
      frozenUsers,
      adminUsers,
      totalTransactions: getState().transactions.length,
      totalFundings: fundings.length,
      totalFundedNgn: fundings.reduce((sum, f) => sum + f.amount, 0),
      tierCounts,
    }
  }

  async addAuditLog(entry: NewAuditEntry) {
    const s = getState()
    s.counter += 1
    s.auditLog.unshift({
      id: `aud_${Date.now()}_${s.counter}`,
      actorId: entry.actorId,
      actorName: entry.actorName,
      action: entry.action,
      targetUserId: entry.targetUserId ?? null,
      detail: entry.detail ?? null,
      createdAt: new Date().toISOString(),
    })
  }

  async listAuditLog(opts?: { limit?: number; targetUserId?: string }) {
    let entries = getState().auditLog
    if (opts?.targetUserId) {
      entries = entries.filter((e) => e.targetUserId === opts.targetUserId)
    }
    return opts?.limit ? entries.slice(0, opts.limit) : entries.slice()
  }
}

// ---------------------------------------------------------------------------
// Backend selection — Postgres (Drizzle) when DATABASE_URL exists, otherwise
// the seeded in-memory store. Import is lazy so the postgres client is never
// touched without a database.
// ---------------------------------------------------------------------------

let _store: WalletStore | null = null

export function getWalletStore(): WalletStore {
  if (!_store) {
    if (process.env.DATABASE_URL) {
      _store = new DrizzleWalletStore()
    } else {
      _store = new InMemoryWalletStore()
    }
  }
  return _store
}

/** Convenience proxy so call sites can keep using `walletStore.method()`. */
export const walletStore: WalletStore = new Proxy({} as WalletStore, {
  get(_target, prop) {
    const store = getWalletStore()
    const value = store[prop as keyof WalletStore]
    return typeof value === 'function' ? value.bind(store) : value
  },
})
