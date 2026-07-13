'use server'

// ---------------------------------------------------------------------------
// Account server actions: notifications, profile, notification/security
// preferences, saved beneficiaries and PIN changes. Every action is scoped to
// the signed-in user and writes through the WalletStore boundary.
// ---------------------------------------------------------------------------
import { verifyPin } from '@/lib/auth/actions'
import { hashSecret } from '@/lib/auth/crypto'
import { requireUser } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'
import { walletStore } from './store'
import { VERIFICATION_TIERS, type TierId } from './tiers'

export interface ActionResult {
  ok: boolean
  error?: string
}

const EMAIL_RE = /\S+@\S+\.\S+/

/** Government ID types accepted for Tier 3 enhanced verification. */
export const KYC_ID_TYPES = [
  'National ID (NIN)',
  'International Passport',
  "Driver's License",
  "Voter's Card",
] as const
export type KycIdType = (typeof KYC_ID_TYPES)[number]

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function markNotificationReadAction(id: string): Promise<void> {
  const user = await requireUser()
  await walletStore.markNotificationRead(user.id, id)
  revalidatePath('/dashboard', 'layout')
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await requireUser()
  await walletStore.markAllNotificationsRead(user.id)
  revalidatePath('/dashboard', 'layout')
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function updateProfileAction(input: {
  name: string
  email: string
  phone: string
}): Promise<ActionResult> {
  const user = await requireUser()

  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  const phone = input.phone.trim()

  if (name.length < 2) return { ok: false, error: 'Please enter your full name.' }
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'Please enter a valid email address.' }

  // Guard against colliding with another account's email.
  if (email !== user.email.toLowerCase()) {
    const existing = await walletStore.getUserByEmail(email)
    if (existing && existing.id !== user.id) {
      return { ok: false, error: 'That email is already in use by another account.' }
    }
  }

  await walletStore.updateUser(user.id, {
    name,
    email,
    phone: phone || null,
  })
  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}

// ---------------------------------------------------------------------------
// KYC verification tier upgrades (data capture + auto-approve).
//
// Product decision: submitting the required KYC data upgrades the tier
// immediately, no manual review. Tier 2 requires a residential address;
// Tier 3 additionally requires a government ID type + number. Upgrades are
// sequential — a user can only move to their current tier + 1.
// ---------------------------------------------------------------------------

export async function submitTierUpgradeAction(input: {
  targetTier: number
  address?: string
  idType?: string
  idNumber?: string
}): Promise<ActionResult> {
  const user = await requireUser()

  if (user.status === 'frozen') {
    return { ok: false, error: 'Your account is frozen. Contact support to continue.' }
  }

  const target = input.targetTier
  if (target !== 2 && target !== 3) {
    return { ok: false, error: 'Invalid verification tier.' }
  }
  if (target !== user.tier + 1) {
    return {
      ok: false,
      error: `You can only upgrade one tier at a time. Complete Tier ${user.tier + 1} first.`,
    }
  }

  const patch: {
    tier: TierId
    kycAddress?: string
    kycIdType?: string
    kycIdNumber?: string
  } = { tier: target as TierId }

  if (target === 2) {
    const address = input.address?.trim() ?? ''
    if (address.length < 10) {
      return { ok: false, error: 'Please enter your full residential address.' }
    }
    patch.kycAddress = address
  }

  if (target === 3) {
    // Tier 3 builds on Tier 2 — ensure an address is on file.
    if (!user.kycAddress) {
      return { ok: false, error: 'Complete Tier 2 address verification first.' }
    }
    const idType = input.idType?.trim() ?? ''
    const idNumber = input.idNumber?.trim() ?? ''
    if (!KYC_ID_TYPES.includes(idType as KycIdType)) {
      return { ok: false, error: 'Please select a valid government ID type.' }
    }
    if (idNumber.replace(/\s/g, '').length < 5) {
      return { ok: false, error: 'Please enter a valid ID number.' }
    }
    patch.kycIdType = idType
    patch.kycIdNumber = idNumber
  }

  await walletStore.updateUser(user.id, patch)
  await walletStore.addNotification({
    userId: user.id,
    title: 'Verification upgraded',
    body: `Your account is now ${VERIFICATION_TIERS[target as TierId].name}. Your new limits are active immediately.`,
  })
  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Notification & security preferences
// ---------------------------------------------------------------------------

type NotificationPref = 'notifyTransactions' | 'notifyPrices' | 'notifyProduct'
type SecurityPref = 'twoFactor' | 'biometric'

export async function setPreferenceAction(
  key: NotificationPref | SecurityPref,
  value: boolean,
): Promise<ActionResult> {
  const user = await requireUser()
  await walletStore.updateUser(user.id, { [key]: value })
  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Beneficiaries
// ---------------------------------------------------------------------------

export async function removeBeneficiaryAction(id: string): Promise<void> {
  const user = await requireUser()
  await walletStore.removeBeneficiary(user.id, id)
  revalidatePath('/dashboard', 'layout')
}

// ---------------------------------------------------------------------------
// Change transaction PIN
// ---------------------------------------------------------------------------

export async function changePinAction(input: {
  currentPin: string
  newPin: string
  confirmPin: string
}): Promise<ActionResult> {
  const user = await requireUser()

  const check = await verifyPin(input.currentPin)
  if (!check.ok) return { ok: false, error: check.error ?? 'Current PIN is incorrect.' }

  if (!/^\d{4}$/.test(input.newPin)) return { ok: false, error: 'New PIN must be exactly 4 digits.' }
  if (input.newPin !== input.confirmPin) return { ok: false, error: "New PINs don't match." }

  await walletStore.updateUser(user.id, { pinHash: hashSecret(input.newPin) })
  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}
