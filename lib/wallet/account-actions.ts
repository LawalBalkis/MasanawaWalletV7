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

export interface ActionResult {
  ok: boolean
  error?: string
}

const EMAIL_RE = /\S+@\S+\.\S+/

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
