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

export interface UserRecord {
  id: string
  name: string
  username: string
  email: string
  phone: string | null
  passwordHash: string
  pinHash: string | null
  tier: TierId
  billstackRef: string
  kycAddress: string | null
  kycIdType: string | null
  kycIdNumber: string | null
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
    | 'pinHash'
    | 'tier'
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

  // Ledger (balances are always derived from these rows)
  addTransactions(txs: LedgerTx[]): Promise<void>
  listTransactions(userId: string, limit?: number): Promise<WalletTx[]>
  getTransaction(userId: string, id: string): Promise<WalletTx | null>
  getBalances(userId: string): Promise<Balances>

  // Fundings (Billstack webhook idempotency log)
  recordFunding(record: FundingRecord): Promise<boolean>
  hasFunding(transactionRef: string): Promise<boolean>
  listFundings(accountReference: string): Promise<FundingRecord[]>
  getFundedTotal(accountReference: string): Promise<number>

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
  transactions: LedgerTx[]
  fundings: Map<string, FundingRecord>
  beneficiaries: Map<string, Beneficiary & { userId: string }>
  notifications: Map<string, WalletNotification & { userId: string }>
  counter: number
}

function seedState(): MemoryState {
  const state: MemoryState = {
    users: new Map(),
    sessions: new Map(),
    transactions: [],
    fundings: new Map(),
    beneficiaries: new Map(),
    notifications: new Map(),
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
    pinHash,
    tier: 1,
    billstackRef: billstackReferenceForUser(id),
    kycAddress: null,
    kycIdType: null,
    kycIdNumber: null,
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
      pinHash: null,
      tier: 1,
      kycAddress: null,
      kycIdType: null,
      kycIdNumber: null,
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

  async recordFunding(record: FundingRecord) {
    const s = getState()
    if (s.fundings.has(record.transactionRef)) return false
    s.fundings.set(record.transactionRef, record)
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
