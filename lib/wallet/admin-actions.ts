'use server'

// ---------------------------------------------------------------------------
// Admin server actions. Every action:
//   • requires the admin role (requireAdmin throws otherwise),
//   • is scoped to a target user it re-fetches server-side,
//   • writes an append-only entry to the admin audit log,
//   • revalidates the /admin console.
//
// Guardrails prevent an admin from locking out or tampering with another
// admin account, and from freezing themselves.
// ---------------------------------------------------------------------------
import { generateId } from '@/lib/auth/crypto'
import { requireAdmin } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { formatNgn } from './assets'
import { walletStore } from './store'
import { VERIFICATION_TIERS, type TierId } from './tiers'
import { getPlatformConfig, setPlatformConfig, type PlatformConfig } from '@/lib/config'

export interface AdminResult {
  ok: boolean
  error?: string
}

function fail(error: string): AdminResult {
  return { ok: false, error }
}

function refreshAdmin() {
  revalidatePath('/admin', 'layout')
}

async function getRequestInfo(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : null
  const userAgent = h.get('user-agent') ?? null
  return { ip, userAgent }
}

// ---------------------------------------------------------------------------
// Account status — freeze / unfreeze
// ---------------------------------------------------------------------------

export async function setUserStatusAction(input: {
  userId: string
  status: 'active' | 'frozen'
  reason?: string
}): Promise<AdminResult> {
  const admin = await requireAdmin()
  const target = await walletStore.getUserById(input.userId)
  if (!target) return fail('User not found.')
  if (target.role === 'admin') return fail('Admin accounts cannot be frozen.')
  if (target.id === admin.id) return fail('You cannot change your own account status.')
  if (input.status !== 'active' && input.status !== 'frozen') return fail('Invalid status.')
  if (target.status === input.status) {
    return fail(`Account is already ${input.status}.`)
  }

  await walletStore.updateUser(target.id, { status: input.status })
  const reqInfo = await getRequestInfo()
  await walletStore.addAuditLog({
    actorId: admin.id,
    actorName: admin.name,
    action: input.status === 'frozen' ? 'user.freeze' : 'user.unfreeze',
    targetUserId: target.id,
    detail: JSON.stringify({ reason: input.reason?.trim() || null }),
    ip: reqInfo.ip,
    userAgent: reqInfo.userAgent,
  })
  await walletStore.addNotification({
    userId: target.id,
    title: input.status === 'frozen' ? 'Account frozen' : 'Account reactivated',
    body:
      input.status === 'frozen'
        ? 'Your account has been frozen and cannot move money. Contact support for help.'
        : 'Your account has been reactivated. You can move money again.',
  })
  refreshAdmin()
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Verification tier — set directly
// ---------------------------------------------------------------------------

export async function setUserTierAction(input: {
  userId: string
  tier: number
  reason?: string
}): Promise<AdminResult> {
  const admin = await requireAdmin()
  const target = await walletStore.getUserById(input.userId)
  if (!target) return fail('User not found.')
  if (input.tier !== 1 && input.tier !== 2 && input.tier !== 3) return fail('Invalid tier.')
  if (target.tier === input.tier) return fail(`User is already on Tier ${input.tier}.`)

  const from = target.tier
  await walletStore.updateUser(target.id, { tier: input.tier as TierId })
  const reqInfo = await getRequestInfo()
  await walletStore.addAuditLog({
    actorId: admin.id,
    actorName: admin.name,
    action: 'user.tier',
    targetUserId: target.id,
    detail: JSON.stringify({ from, to: input.tier, reason: input.reason?.trim() || null }),
    ip: reqInfo.ip,
    userAgent: reqInfo.userAgent,
  })
  await walletStore.addNotification({
    userId: target.id,
    title: 'Verification tier updated',
    body: `Your account is now ${VERIFICATION_TIERS[input.tier as TierId].name}. New limits are active immediately.`,
  })
  refreshAdmin()
  return { ok: true }
}

// ---------------------------------------------------------------------------
// PIN reset
// ---------------------------------------------------------------------------

export async function resetPinAction(input: {
  userId: string
  reason?: string
}): Promise<AdminResult> {
  const admin = await requireAdmin()
  const target = await walletStore.getUserById(input.userId)
  if (!target) return fail('User not found.')
  if (target.role === 'admin') return fail('Admin PINs cannot be reset by other admins.')

  await walletStore.updateUser(target.id, { pinHash: null })
  const reqInfo = await getRequestInfo()
  await walletStore.addAuditLog({
    actorId: admin.id,
    actorName: admin.name,
    action: 'user.pin_reset',
    targetUserId: target.id,
    detail: JSON.stringify({ reason: input.reason?.trim() || null }),
    ip: reqInfo.ip,
    userAgent: reqInfo.userAgent,
  })
  await walletStore.addNotification({
    userId: target.id,
    title: 'Transaction PIN reset',
    body: 'Your transaction PIN has been reset by an admin. Please set a new PIN to continue moving money.',
  })
  refreshAdmin()
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Email verification (admin override)
// ---------------------------------------------------------------------------

export async function verifyEmailAction(input: {
  userId: string
}): Promise<AdminResult> {
  const admin = await requireAdmin()
  const target = await walletStore.getUserById(input.userId)
  if (!target) return fail('User not found.')

  await walletStore.updateUser(target.id, { emailVerified: true })
  const reqInfo = await getRequestInfo()
  await walletStore.addAuditLog({
    actorId: admin.id,
    actorName: admin.name,
    action: 'user.email_verify',
    targetUserId: target.id,
    detail: JSON.stringify({ email: target.email }),
    ip: reqInfo.ip,
    userAgent: reqInfo.userAgent,
  })
  refreshAdmin()
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Manual balance adjustment
// ---------------------------------------------------------------------------

export async function manualBalanceAction(input: {
  userId: string
  direction: 'credit' | 'debit'
  amount: number
  reason: string
}): Promise<AdminResult> {
  const admin = await requireAdmin()
  const target = await walletStore.getUserById(input.userId)
  if (!target) return fail('User not found.')
  if (target.role === 'admin') return fail('Cannot adjust an admin account balance.')
  const amount = Math.round(input.amount * 100) / 100
  if (!amount || amount <= 0) return fail('Amount must be positive.')
  if (!input.reason.trim()) return fail('A reason is required.')

  const txId = generateId('tx')
  const signedAmount = input.direction === 'credit' ? amount : -amount
  await walletStore.addTransactions([{
    id: txId,
    userId: target.id,
    type: input.direction === 'credit' ? 'fund' : 'withdraw',
    asset: 'MSN',
    amount: signedAmount,
    ngnValue: signedAmount,
    feeNgn: 0,
    counterparty: admin.name,
    note: input.reason.trim(),
    status: 'completed',
    date: new Date().toISOString(),
  }])

  await walletStore.addNotification({
    userId: target.id,
    title: input.direction === 'credit' ? 'Account credited' : 'Account debited',
    body:
      input.direction === 'credit'
        ? `${formatNgn(amount)} has been credited to your wallet. Reason: ${input.reason.trim()}`
        : `${formatNgn(amount)} has been debited from your wallet. Reason: ${input.reason.trim()}`,
  })

  const reqInfo = await getRequestInfo()
  await walletStore.addAuditLog({
    actorId: admin.id,
    actorName: admin.name,
    action: input.direction === 'credit' ? 'balance.credit' : 'balance.debit',
    targetUserId: target.id,
    detail: JSON.stringify({ amount, reason: input.reason.trim(), txId }),
    ip: reqInfo.ip,
    userAgent: reqInfo.userAgent,
  })
  refreshAdmin()
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Phase B-2: Platform config management
// ---------------------------------------------------------------------------

export async function updatePlatformConfigAction(
  input: Partial<PlatformConfig>,
): Promise<AdminResult> {
  const admin = await requireAdmin()
  await setPlatformConfig(input, admin.id)
  const reqInfo = await getRequestInfo()
  await walletStore.addAuditLog({
    actorId: admin.id,
    actorName: admin.name,
    action: 'config.update',
    targetUserId: null,
    detail: JSON.stringify(input),
    ip: reqInfo.ip,
    userAgent: reqInfo.userAgent,
  })
  refreshAdmin()
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Phase B-5: Team management — promote/demote admin, force sign-out
// ---------------------------------------------------------------------------

export async function setUserRoleAction(input: {
  userId: string
  role: 'user' | 'admin'
  reason?: string
}): Promise<AdminResult> {
  const admin = await requireAdmin()
  if (admin.id === input.userId) return fail('You cannot change your own role.')
  const target = await walletStore.getUserById(input.userId)
  if (!target) return fail('User not found.')
  if (target.role === 'superadmin') return fail('Cannot modify a super-admin.')

  await walletStore.updateUser(target.id, { role: input.role })
  const reqInfo = await getRequestInfo()
  await walletStore.addAuditLog({
    actorId: admin.id,
    actorName: admin.name,
    action: 'user.role',
    targetUserId: target.id,
    detail: JSON.stringify({ from: target.role, to: input.role, reason: input.reason?.trim() || null }),
    ip: reqInfo.ip,
    userAgent: reqInfo.userAgent,
  })
  refreshAdmin()
  return { ok: true }
}

export async function forceSignOutAction(input: { userId: string }): Promise<AdminResult> {
  const admin = await requireAdmin()
  const target = await walletStore.getUserById(input.userId)
  if (!target) return fail('User not found.')
  if (target.role === 'superadmin') return fail('Cannot force sign-out a super-admin.')

  await walletStore.forceSignOutUser(target.id)
  const reqInfo = await getRequestInfo()
  await walletStore.addAuditLog({
    actorId: admin.id,
    actorName: admin.name,
    action: 'user.force_signout',
    targetUserId: target.id,
    detail: null,
    ip: reqInfo.ip,
    userAgent: reqInfo.userAgent,
  })
  refreshAdmin()
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Phase B-7: Broadcast announcements
// ---------------------------------------------------------------------------

export async function broadcastAnnouncementAction(input: {
  title: string
  body: string
}): Promise<AdminResult> {
  const admin = await requireAdmin()
  const title = input.title.trim()
  const body = input.body.trim()
  if (!title || !body) return fail('Title and body are required.')

  const count = await walletStore.broadcastNotification({ title, body })
  const reqInfo = await getRequestInfo()
  await walletStore.addAuditLog({
    actorId: admin.id,
    actorName: admin.name,
    action: 'announcement.broadcast',
    targetUserId: null,
    detail: JSON.stringify({ title, recipientCount: count }),
    ip: reqInfo.ip,
    userAgent: reqInfo.userAgent,
  })
  refreshAdmin()
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Phase B-6: Funding reconciliation
// ---------------------------------------------------------------------------

export async function reassignFundingAction(input: {
  transactionRef: string
  userId: string
}): Promise<AdminResult> {
  const admin = await requireAdmin()
  const target = await walletStore.getUserById(input.userId)
  if (!target) return fail('Target user not found.')

  await walletStore.reassignFunding(input.transactionRef, input.userId)
  const reqInfo = await getRequestInfo()
  await walletStore.addAuditLog({
    actorId: admin.id,
    actorName: admin.name,
    action: 'funding.reassign',
    targetUserId: input.userId,
    detail: JSON.stringify({ transactionRef: input.transactionRef }),
    ip: reqInfo.ip,
    userAgent: reqInfo.userAgent,
  })
  refreshAdmin()
  return { ok: true }
}

export async function refundFundingAction(input: {
  transactionRef: string
}): Promise<AdminResult> {
  const admin = await requireAdmin()

  await walletStore.refundFunding(input.transactionRef)
  const reqInfo = await getRequestInfo()
  await walletStore.addAuditLog({
    actorId: admin.id,
    actorName: admin.name,
    action: 'funding.refund',
    targetUserId: null,
    detail: JSON.stringify({ transactionRef: input.transactionRef }),
    ip: reqInfo.ip,
    userAgent: reqInfo.userAgent,
  })
  refreshAdmin()
  return { ok: true }
}

export const adjustBalanceAction = manualBalanceAction
export const resetUserPinAction = resetPinAction
export const verifyUserEmailAction = verifyEmailAction
