// ---------------------------------------------------------------------------
// DrizzleWalletStore — the Postgres implementation of WalletStore.
// Activated automatically when DATABASE_URL is set. The schema is committed
// to the repo (lib/db/schema.ts + /drizzle migrations); apply it to any
// Postgres database with `pnpm db:migrate`.
// ---------------------------------------------------------------------------
import 'server-only'

import { getDb, schema } from '@/lib/db'
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm'
import type { AssetSymbol, Beneficiary, TxType, WalletNotification, WalletTx } from './assets'
import { computeBalances, type Balances } from './ledger'
import type {
  AdminAuditEntry,
  AdminFunding,
  AdminLedgerTx,
  AuthTokenKind,
  AuthTokenRecord,
  FundingCredit,
  FundingRecord,
  LedgerTx,
  NewAuditEntry,
  NewUser,
  NotificationInput,
  PlatformStats,
  ReferralListItem,
  ReferralRecord,
  ReferralStats,
  SessionRecord,
  UserListOptions,
  UserPatch,
  UserRecord,
  UserRole,
  UserStatus,
  WalletStore,
} from './store'
import type { TierId } from './tiers'

const {
  users,
  sessions,
  authTokens,
  transactions,
  fundings,
  beneficiaries,
  notifications,
  adminAuditLog,
  referrals,
  rateLimits,
} = schema

type ReferralRow = typeof referrals.$inferSelect

function toReferralRecord(row: ReferralRow): ReferralRecord {
  return {
    id: row.id,
    referrerId: row.referrerId,
    referredUserId: row.referredUserId,
    qualified: row.qualified,
    bonusNgn: row.bonusNgn,
    qualifiedAt: row.qualifiedAt ? row.qualifiedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }
}

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
    role: row.role as UserRole,
    status: row.status as UserStatus,
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
      ip: session.ip ?? null,
      userAgent: session.userAgent ?? null,
      lastSeenAt: new Date(),
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
    // Touch lastSeenAt in the background (fire-and-forget)
    getDb()
      .update(sessions)
      .set({ lastSeenAt: new Date() })
      .where(eq(sessions.tokenHash, tokenHash))
      .then(() => {}, () => {})
    return {
      tokenHash: row.tokenHash,
      userId: row.userId,
      expiresAt: row.expiresAt.toISOString(),
      ip: row.ip,
      userAgent: row.userAgent,
      lastSeenAt: row.lastSeenAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    }
  }

  async deleteSession(tokenHash: string) {
    await getDb().delete(sessions).where(eq(sessions.tokenHash, tokenHash))
  }

  async listSessions(userId: string) {
    const rows = await getDb()
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), sql`${sessions.expiresAt} >= now()`))
      .orderBy(desc(sessions.createdAt))
    return rows.map((row) => ({
      tokenHash: row.tokenHash,
      userId: row.userId,
      expiresAt: row.expiresAt.toISOString(),
      ip: row.ip,
      userAgent: row.userAgent,
      lastSeenAt: row.lastSeenAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    }))
  }

  async deleteOtherSessions(userId: string, keepTokenHash: string) {
    await getDb()
      .delete(sessions)
      .where(and(eq(sessions.userId, userId), sql`${sessions.tokenHash} != ${keepTokenHash}`))
  }

  async touchSession(tokenHash: string) {
    await getDb()
      .update(sessions)
      .set({ lastSeenAt: new Date() })
      .where(eq(sessions.tokenHash, tokenHash))
  }

  async getRateLimit(key: string) {
    const [row] = await getDb()
      .select()
      .from(rateLimits)
      .where(eq(rateLimits.key, key))
      .limit(1)
    if (!row) return null
    return { count: row.count, windowStart: row.windowStart.toISOString() }
  }

  async upsertRateLimit(key: string, count: number, windowStart: string) {
    await getDb()
      .insert(rateLimits)
      .values({ key, count, windowStart: new Date(windowStart), updatedAt: new Date() })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: { count, windowStart: new Date(windowStart), updatedAt: new Date() },
      })
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

  async recordReferral(referrerId: string, referredUserId: string, bonusNgn: number) {
    await getDb().transaction(async (tx) => {
      const inserted = await tx
        .insert(referrals)
        .values({
          id: `ref_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
          referrerId,
          referredUserId,
          bonusNgn,
        })
        .onConflictDoNothing()
        .returning({ id: referrals.id })
      if (inserted.length > 0) {
        await tx.update(users).set({ referredBy: referrerId }).where(eq(users.id, referredUserId))
      }
    })
  }

  async getReferralForUser(referredUserId: string) {
    const [row] = await getDb()
      .select()
      .from(referrals)
      .where(eq(referrals.referredUserId, referredUserId))
      .limit(1)
    return row ? toReferralRecord(row) : null
  }

  async qualifyReferral(referredUserId: string) {
    const [row] = await getDb()
      .update(referrals)
      .set({ qualified: true, qualifiedAt: new Date() })
      .where(and(eq(referrals.referredUserId, referredUserId), eq(referrals.qualified, false)))
      .returning()
    return row ? toReferralRecord(row) : null
  }

  async getReferralStats(referrerId: string): Promise<ReferralStats> {
    const db = getDb()
    const [rows, [userRow]] = await Promise.all([
      db
        .select({ referral: referrals, name: users.name, username: users.username })
        .from(referrals)
        .innerJoin(users, eq(referrals.referredUserId, users.id))
        .where(eq(referrals.referrerId, referrerId))
        .orderBy(desc(referrals.createdAt)),
      db
        .select({ referralWithdrawn: users.referralWithdrawn })
        .from(users)
        .where(eq(users.id, referrerId))
        .limit(1),
    ])
    const withdrawnNgn = userRow?.referralWithdrawn ?? 0
    const list: ReferralListItem[] = rows.map((r) => ({
      referredUserId: r.referral.referredUserId,
      referredName: r.name,
      referredUsername: r.username,
      qualified: r.referral.qualified,
      bonusNgn: r.referral.bonusNgn,
      joinedAt: r.referral.createdAt.toISOString(),
    }))
    const qualified = list.filter((r) => r.qualified)
    const earnedNgn = qualified.reduce((sum, r) => sum + r.bonusNgn, 0)
    return {
      total: list.length,
      qualified: qualified.length,
      pending: list.length - qualified.length,
      earnedNgn,
      withdrawnNgn,
      availableNgn: Math.max(0, earnedNgn - withdrawnNgn),
      referrals: list,
    }
  }

  async withdrawReferralEarnings(userId: string, amount: number, txId: string) {
    return await getDb().transaction(async (tx) => {
      const [earnedRow] = await tx
        .select({
          earned: sql<number>`coalesce(sum(${referrals.bonusNgn}) filter (where ${referrals.qualified}), 0)::float8`,
        })
        .from(referrals)
        .where(eq(referrals.referrerId, userId))
      const [userRow] = await tx
        .select({ withdrawn: users.referralWithdrawn })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
      if (!userRow) return false
      const available = (earnedRow?.earned ?? 0) - userRow.withdrawn
      if (amount <= 0 || amount > available) return false

      await tx
        .update(users)
        .set({ referralWithdrawn: sql`${users.referralWithdrawn} + ${amount}` })
        .where(eq(users.id, userId))
      await tx
        .insert(transactions)
        .values({
          id: txId,
          userId,
          type: 'receive',
          asset: 'NGN',
          amount,
          ngnValue: amount,
          feeNgn: 0,
          counterparty: 'Masanawa Referrals',
          note: 'Referral earnings',
          status: 'completed',
        })
        .onConflictDoNothing()
      return true
    })
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

  async listUsers(opts?: UserListOptions) {
    const search = opts?.search?.trim()
    const where = search
      ? or(
          ilike(users.name, `%${search}%`),
          ilike(users.username, `%${search}%`),
          ilike(users.email, `%${search}%`),
        )
      : undefined
    let q = getDb().select().from(users).where(where).orderBy(desc(users.createdAt)).$dynamic()
    if (opts?.limit != null) q = q.limit(opts.limit)
    if (opts?.offset != null) q = q.offset(opts.offset)
    const rows = await q
    return rows.map(toUserRecord)
  }

  async countUsers(search?: string) {
    const trimmed = search?.trim()
    const where = trimmed
      ? or(
          ilike(users.name, `%${trimmed}%`),
          ilike(users.username, `%${trimmed}%`),
          ilike(users.email, `%${trimmed}%`),
        )
      : undefined
    const [row] = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(where)
    return row?.count ?? 0
  }

  async listAllTransactions(opts?: { limit?: number; offset?: number }): Promise<AdminLedgerTx[]> {
    let q = getDb()
      .select({ tx: transactions, username: users.username, userName: users.name })
      .from(transactions)
      .innerJoin(users, eq(transactions.userId, users.id))
      .orderBy(desc(transactions.createdAt))
      .$dynamic()
    if (opts?.limit != null) q = q.limit(opts.limit)
    if (opts?.offset != null) q = q.offset(opts.offset)
    const rows = await q
    return rows.map((r) => ({
      ...toWalletTx(r.tx),
      userId: r.tx.userId,
      username: r.username,
      userName: r.userName,
    }))
  }

  async listAllFundings(opts?: { limit?: number; offset?: number }): Promise<AdminFunding[]> {
    let q = getDb()
      .select({ funding: fundings, userId: users.id, username: users.username })
      .from(fundings)
      .leftJoin(users, eq(fundings.accountReference, users.billstackRef))
      .orderBy(desc(fundings.receivedAt))
      .$dynamic()
    if (opts?.limit != null) q = q.limit(opts.limit)
    if (opts?.offset != null) q = q.offset(opts.offset)
    const rows = await q
    return rows.map((r) => ({
      ...toFundingRecord(r.funding),
      userId: r.userId ?? null,
      username: r.username ?? null,
    }))
  }

  async getPlatformStats(): Promise<PlatformStats> {
    const db = getDb()
    const [[userAgg], tierRows, [txAgg], [fundAgg]] = await Promise.all([
      db
        .select({
          total: sql<number>`count(*)::int`,
          frozen: sql<number>`count(*) filter (where ${users.status} = 'frozen')::int`,
          admins: sql<number>`count(*) filter (where ${users.role} = 'admin')::int`,
        })
        .from(users),
      db.select({ tier: users.tier, count: sql<number>`count(*)::int` }).from(users).groupBy(users.tier),
      db.select({ count: sql<number>`count(*)::int` }).from(transactions),
      db
        .select({
          count: sql<number>`count(*)::int`,
          total: sql<number>`coalesce(sum(${fundings.amount}), 0)::float8`,
        })
        .from(fundings),
    ])
    const tierCounts: Record<TierId, number> = { 1: 0, 2: 0, 3: 0 }
    for (const r of tierRows) tierCounts[r.tier as TierId] = r.count
    return {
      totalUsers: userAgg?.total ?? 0,
      frozenUsers: userAgg?.frozen ?? 0,
      adminUsers: userAgg?.admins ?? 0,
      totalTransactions: txAgg?.count ?? 0,
      totalFundings: fundAgg?.count ?? 0,
      totalFundedNgn: fundAgg?.total ?? 0,
      tierCounts,
    }
  }

  async addAuditLog(entry: NewAuditEntry) {
    await getDb()
      .insert(adminAuditLog)
      .values({
        id: `aud_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`,
        actorId: entry.actorId,
        actorName: entry.actorName,
        action: entry.action,
        targetUserId: entry.targetUserId ?? null,
        detail: entry.detail ?? null,
      })
  }

  async listAuditLog(opts?: { limit?: number; targetUserId?: string }): Promise<AdminAuditEntry[]> {
    let q = getDb()
      .select()
      .from(adminAuditLog)
      .where(opts?.targetUserId ? eq(adminAuditLog.targetUserId, opts.targetUserId) : undefined)
      .orderBy(desc(adminAuditLog.createdAt))
      .$dynamic()
    if (opts?.limit != null) q = q.limit(opts.limit)
    const rows = await q
    return rows.map((r) => ({
      id: r.id,
      actorId: r.actorId,
      actorName: r.actorName,
      action: r.action,
      targetUserId: r.targetUserId ?? null,
      detail: r.detail ?? null,
      createdAt: r.createdAt.toISOString(),
    }))
  }
}
