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
import { formatNgn } from './assets'
import { walletStore } from './store'
import { VERIFICATION_TIERS, type TierId } from './tiers'

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
  await walletStore.addAuditLog({
    actorId: admin.id,
    actorName: admin.name,
    action: input.status === 'frozen' ? 'user.freeze' : 'user.unfreeze',
    targetUserId: target.id,
    detail: JSON.stringify({ reason: input.reason?.trim() || null }),
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
  await walletStore.addAuditLog({
    actorId: admin.id,
    actorName: admin.name,
    action: 'user.tier',
    targetUserId: target.id,
    detail: JSON.stringify({ from, to: input.tier, reason: input.reason?.trim() || null }),
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
// Reset transaction PIN — clears the PIN so the user must set a new one on
// their next sign-in (the dashboard redirects to /auth/pin when no PIN is set).
// ---------------------------------------------------------------------------

export async function resetUserPinAction(input: {
  userId: string
  reason?: string
}): Promise<AdminResult> {
  const admin = await requireAdmin()
  const target = await walletStore.getUserById(input.userId)
  if (!target) return fail('User not found.')
  if (target.role === 'admin' && target.id !== admin.id) {
    return fail('You cannot reset another admin’s PIN.')
  }
  if (!target.pinHash) return fail('This user has no PIN set.')

  await walletStore.updateUser(target.id, { pinHash: null })
  await walletStore.addAuditLog({
    actorId: admin.id,
    actorName: admin.name,
    action: 'user.pin_reset',
    targetUserId: target.id,
    detail: JSON.stringify({ reason: input.reason?.trim() || null }),
  })
  await walletStore.addNotification({
    userId: target.id,
    title: 'Transaction PIN reset',
    body: 'Your PIN was reset by support. You will be asked to set a new one next time you sign in.',
  })
  refreshAdmin()
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Manually mark a user's email verified (e.g. resolving a stuck sign-up).
// ---------------------------------------------------------------------------

export async function verifyUserEmailAction(input: { userId: string }): Promise<AdminResult> {
  const admin = await requireAdmin()
  const target = await walletStore.getUserById(input.userId)
  if (!target) return fail('User not found.')
  if (target.emailVerified) return fail('This email is already verified.')

  await walletStore.updateUser(target.id, { emailVerified: true })
  await walletStore.addAuditLog({
    actorId: admin.id,
    actorName: admin.name,
    action: 'user.email_verify',
    targetUserId: target.id,
    detail: JSON.stringify({ email: target.email }),
  })
  refreshAdmin()
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Manual NGN balance adjustment (credit / debit). Writes a ledger row so the
// user's derived balance updates, plus an audit entry and a notification.
// ---------------------------------------------------------------------------

export async function adjustBalanceAction(input: {
  userId: string
  direction: 'credit' | 'debit'
  amount: number
  reason: string
}): Promise<AdminResult> {
  const admin = await requireAdmin()
  const target = await walletStore.getUserById(input.userId)
  if (!target) return fail('User not found.')

  const reason = input.reason.trim()
  if (reason.length < 3) return fail('A reason is required for manual adjustments.')

  const amount = Math.round(Number(input.amount) * 100) / 100
  if (!Number.isFinite(amount) || amount <= 0) return fail('Enter a valid amount.')
  if (input.direction !== 'credit' && input.direction !== 'debit') {
    return fail('Invalid adjustment direction.')
  }

  if (input.direction === 'debit') {
    const balances = await walletStore.getBalances(target.id)
    if (amount > balances.NGN) {
      return fail(`Debit ${formatNgn(amount)} exceeds the user’s ${formatNgn(balances.NGN)} balance.`)
    }
  }

  const signed = input.direction === 'credit' ? amount : -amount
  const txId = generateId('tx')
  await walletStore.addTransactions([
    {
      id: txId,
      userId: target.id,
      type: input.direction === 'credit' ? 'fund' : 'withdraw',
      asset: 'NGN',
      amount: signed,
      ngnValue: amount,
      feeNgn: 0,
      counterparty: 'Masanawa Support',
      note: `Manual ${input.direction}: ${reason}`,
      status: 'completed',
      date: new Date().toISOString(),
    },
  ])
  await walletStore.addAuditLog({
    actorId: admin.id,
    actorName: admin.name,
    action: input.direction === 'credit' ? 'balance.credit' : 'balance.debit',
    targetUserId: target.id,
    detail: JSON.stringify({ amount, reason, txId }),
  })
  await walletStore.addNotification({
    userId: target.id,
    title: input.direction === 'credit' ? 'Wallet credited' : 'Wallet debited',
    body: `${formatNgn(amount)} was ${input.direction === 'credit' ? 'added to' : 'deducted from'} your NGN balance by support. Reason: ${reason}`,
    txId,
  })
  refreshAdmin()
  return { ok: true }
}
