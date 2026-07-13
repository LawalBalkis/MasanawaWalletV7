// ---------------------------------------------------------------------------
// DrizzleWalletStore — the Postgres implementation of WalletStore.
// Activated automatically when DATABASE_URL is set. The schema is committed
// to the repo (lib/db/schema.ts + /drizzle migrations); apply it to any
// Postgres database with `pnpm db:migrate`.
// ---------------------------------------------------------------------------
import 'server-only'

import { getDb, schema } from '@/lib/db'
import { and, desc, eq, sql } from 'drizzle-orm'
import type { AssetSymbol, Beneficiary, TxType, WalletNotification, WalletTx } from './assets'
import { computeBalances, type Balances } from './ledger'
import type {
  AuthTokenKind,
  AuthTokenRecord,
  FundingCredit,
  FundingRecord,
  LedgerTx,
  NewUser,
  NotificationInput,
  SessionRecord,
  UserPatch,
  UserRecord,
  WalletStore,
} from './store'
import type { TierId } from './tiers'

const { users, sessions, authTokens, transactions, fundings, beneficiaries, notifications } =
  schema

type UserRow = typeof users.$inferSelect
type TxRow = typeof transactions.$inferSelect
type FundingRow = typeof fundings.$inferSelect
type NotificationRow = typeof notifications.$inferSelect
type AuthTokenRow = typeof authTokens.$inferSelect

function toAuthToken(row: AuthTokenRow): AuthTokenRecord {
  return {
    id: row.id,
    userId: row.userId,
    kind: row.kind as AuthTokenKind,
    secretHash: row.secretHash,
    expiresAt: row.expiresAt.toISOString(),
    attempts: row.attempts,
  }
}

function toUserRecord(row: UserRow): UserRecord {
  return {
    ...row,
    tier: row.tier as TierId,
    createdAt: row.createdAt.toISOString(),
  }
}

function toWalletTx(row: TxRow): WalletTx {
  return {
    id: row.id,
    type: row.type as TxType,
    asset: row.asset as AssetSymbol,
    amount: row.amount,
    ngnValue: row.ngnValue,
    feeNgn: row.feeNgn,
    counterparty: row.counterparty ?? undefined,
    note: row.note ?? undefined,
    status: row.status as WalletTx['status'],
    date: row.createdAt.toISOString(),
  }
}

function toFundingRecord(row: FundingRow): FundingRecord {
  return {
    transactionRef: row.transactionRef,
    accountReference: row.accountReference,
    amount: row.amount,
    payerName: row.payerName,
    payerAccountNumber: row.payerAccountNumber,
    receivedAt: row.receivedAt.toISOString(),
  }
}

function toNotification(row: NotificationRow): WalletNotification {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    read: row.read,
    txId: row.txId ?? undefined,
    date: row.createdAt.toISOString(),
  }
}

export class DrizzleWalletStore implements WalletStore {
  async createUser(user: NewUser): Promise<UserRecord> {
    const [row] = await getDb()
      .insert(users)
      .values({
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone ?? null,
        passwordHash: user.passwordHash,
        billstackRef: user.billstackRef,
      })
      .returning()
    return toUserRecord(row)
  }

  async getUserById(id: string) {
    const [row] = await getDb().select().from(users).where(eq(users.id, id)).limit(1)
    return row ? toUserRecord(row) : null
  }

  async getUserByEmail(email: string) {
    const [row] = await getDb()
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)
      .limit(1)
    return row ? toUserRecord(row) : null
  }

  async getUserByUsername(username: string) {
    const [row] = await getDb()
      .select()
      .from(users)
      .where(sql`lower(${users.username}) = ${username.toLowerCase()}`)
      .limit(1)
    return row ? toUserRecord(row) : null
  }

  async getUserByBillstackRef(ref: string) {
    const [row] = await getDb().select().from(users).where(eq(users.billstackRef, ref)).limit(1)
    return row ? toUserRecord(row) : null
  }

  async updateUser(id: string, patch: UserPatch) {
    const [row] = await getDb().update(users).set(patch).where(eq(users.id, id)).returning()
    return row ? toUserRecord(row) : null
  }

  async createSession(session: SessionRecord) {
    await getDb().insert(sessions).values({
      tokenHash: session.tokenHash,
      userId: session.userId,
      expiresAt: new Date(session.expiresAt),
    })
  }

  async getSession(tokenHash: string) {
    const [row] = await getDb()
      .select()
      .from(sessions)
      .where(eq(sessions.tokenHash, tokenHash))
      .limit(1)
    if (!row) return null
    if (row.expiresAt < new Date()) {
      await this.deleteSession(tokenHash)
      return null
    }
    return {
      tokenHash: row.tokenHash,
      userId: row.userId,
      expiresAt: row.expiresAt.toISOString(),
    }
  }

  async deleteSession(tokenHash: string) {
    await getDb().delete(sessions).where(eq(sessions.tokenHash, tokenHash))
  }

  async createAuthToken(token: AuthTokenRecord) {
    await getDb().insert(authTokens).values({
      id: token.id,
      userId: token.userId,
      kind: token.kind,
      secretHash: token.secretHash,
      expiresAt: new Date(token.expiresAt),
      attempts: token.attempts,
    })
  }

  async getLatestAuthToken(userId: string, kind: AuthTokenKind) {
    const [row] = await getDb()
      .select()
      .from(authTokens)
      .where(and(eq(authTokens.userId, userId), eq(authTokens.kind, kind)))
      .orderBy(desc(authTokens.createdAt))
      .limit(1)
    return row ? toAuthToken(row) : null
  }

  async getAuthTokenBySecret(secretHash: string, kind: AuthTokenKind) {
    const [row] = await getDb()
      .select()
      .from(authTokens)
      .where(and(eq(authTokens.secretHash, secretHash), eq(authTokens.kind, kind)))
      .limit(1)
    return row ? toAuthToken(row) : null
  }

  async incrementAuthTokenAttempts(id: string) {
    const [row] = await getDb()
      .update(authTokens)
      .set({ attempts: sql`${authTokens.attempts} + 1` })
      .where(eq(authTokens.id, id))
      .returning({ attempts: authTokens.attempts })
    return row?.attempts ?? 0
  }

  async deleteAuthToken(id: string) {
    await getDb().delete(authTokens).where(eq(authTokens.id, id))
  }

  async deleteAuthTokensForUser(userId: string, kind: AuthTokenKind) {
    await getDb()
      .delete(authTokens)
      .where(and(eq(authTokens.userId, userId), eq(authTokens.kind, kind)))
  }

  async addTransactions(txs: LedgerTx[]) {
    if (txs.length === 0) return
    await getDb()
      .insert(transactions)
      .values(
        txs.map((tx) => ({
          id: tx.id,
          userId: tx.userId,
          type: tx.type,
          asset: tx.asset,
          amount: tx.amount,
          ngnValue: tx.ngnValue,
          feeNgn: tx.feeNgn ?? 0,
          counterparty: tx.counterparty ?? null,
          note: tx.note ?? null,
          status: tx.status,
          createdAt: new Date(tx.date),
        })),
      )
  }

  async listTransactions(userId: string, limit?: number) {
    const base = getDb()
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
    const rows = limit ? await base.limit(limit) : await base
    return rows.map(toWalletTx)
  }

  async getTransaction(userId: string, id: string) {
    const [row] = await getDb()
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.id, id)))
      .limit(1)
    return row ? toWalletTx(row) : null
  }

  async getBalances(userId: string): Promise<Balances> {
    return computeBalances(await this.listTransactions(userId))
  }

  async recordFunding(record: FundingRecord, credit: FundingCredit) {
    // Atomic: the idempotency row and the NGN ledger credit are inserted in a
    // single transaction. If either fails, neither is committed, so Billstack's
    // retry can safely re-attempt without double-crediting.
    return await getDb().transaction(async (tx) => {
      const inserted = await tx
        .insert(fundings)
        .values({
          transactionRef: record.transactionRef,
          accountReference: record.accountReference,
          amount: record.amount,
          payerName: record.payerName,
          payerAccountNumber: record.payerAccountNumber,
          receivedAt: new Date(record.receivedAt),
        })
        .onConflictDoNothing()
        .returning({ ref: fundings.transactionRef })

      if (inserted.length === 0) return false

      await tx
        .insert(transactions)
        .values({
          id: credit.txId,
          userId: credit.userId,
          type: 'fund',
          asset: 'NGN',
          amount: record.amount,
          ngnValue: record.amount,
          feeNgn: 0,
          counterparty: record.payerName,
          note: credit.note ?? `Bank deposit from ${record.payerName}`,
          status: 'completed',
          createdAt: new Date(record.receivedAt),
        })
        .onConflictDoNothing()

      return true
    })
  }

  async hasFunding(transactionRef: string) {
    const [row] = await getDb()
      .select({ ref: fundings.transactionRef })
      .from(fundings)
      .where(eq(fundings.transactionRef, transactionRef))
      .limit(1)
    return Boolean(row)
  }

  async listFundings(accountReference: string) {
    const rows = await getDb()
      .select()
      .from(fundings)
      .where(eq(fundings.accountReference, accountReference))
      .orderBy(desc(fundings.receivedAt))
    return rows.map(toFundingRecord)
  }

  async getFundedTotal(accountReference: string) {
    const [row] = await getDb()
      .select({ total: sql<number>`coalesce(sum(${fundings.amount}), 0)::float8` })
      .from(fundings)
      .where(eq(fundings.accountReference, accountReference))
    return row?.total ?? 0
  }

  async listBeneficiaries(userId: string): Promise<Beneficiary[]> {
    const rows = await getDb()
      .select()
      .from(beneficiaries)
      .where(eq(beneficiaries.userId, userId))
      .orderBy(desc(beneficiaries.createdAt))
    return rows.map((r) => ({
      id: r.id,
      bank: r.bank,
      accountNumber: r.accountNumber,
      accountName: r.accountName,
    }))
  }

  async addBeneficiary(userId: string, b: Omit<Beneficiary, 'id'>): Promise<Beneficiary> {
    const existing = await getDb()
      .select()
      .from(beneficiaries)
      .where(
        and(
          eq(beneficiaries.userId, userId),
          eq(beneficiaries.bank, b.bank),
          eq(beneficiaries.accountNumber, b.accountNumber),
        ),
      )
      .limit(1)
    if (existing[0]) {
      const r = existing[0]
      return { id: r.id, bank: r.bank, accountNumber: r.accountNumber, accountName: r.accountName }
    }
    const id = `ben_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
    await getDb().insert(beneficiaries).values({ id, userId, ...b })
    return { id, ...b }
  }

  async removeBeneficiary(userId: string, id: string) {
    await getDb()
      .delete(beneficiaries)
      .where(and(eq(beneficiaries.userId, userId), eq(beneficiaries.id, id)))
  }

  async listNotifications(userId: string) {
    const rows = await getDb()
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
    return rows.map(toNotification)
  }

  async addNotification(input: NotificationInput) {
    const id = `nt_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
    await getDb().insert(notifications).values({
      id,
      userId: input.userId,
      title: input.title,
      body: input.body,
      txId: input.txId ?? null,
    })
  }

  async markNotificationRead(userId: string, id: string) {
    await getDb()
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.id, id)))
  }

  async markAllNotificationsRead(userId: string) {
    await getDb()
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
  }

  async getUnreadCount(userId: string) {
    const [row] = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
    return row?.count ?? 0
  }
}
