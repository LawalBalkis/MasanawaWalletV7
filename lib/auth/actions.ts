'use server'

// ---------------------------------------------------------------------------
// Auth server actions: sign-up, sign-in, sign-out, PIN set/verify.
// All state lives behind the WalletStore boundary — these work identically
// on the in-memory backend and Postgres.
// ---------------------------------------------------------------------------
import { billstackReferenceForUser, walletStore } from '@/lib/wallet/store'
import { redirect } from 'next/navigation'
import { generateId, hashSecret, verifySecret } from './crypto'
import { rateLimit } from './rate-limit'
import { createSessionForUser, destroySession, requireUser } from './session'

export interface AuthFormState {
  error?: string
}

const EMAIL_RE = /\S+@\S+\.\S+/
const USERNAME_RE = /^[a-z0-9_]{3,20}$/

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const name = String(formData.get('name') ?? '').trim()
  const username = String(formData.get('username') ?? '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (name.length < 2) return { error: 'Please enter your full name.' }
  if (!USERNAME_RE.test(username))
    return { error: 'Username must be 3–20 characters: letters, numbers and underscores only.' }
  if (!EMAIL_RE.test(email)) return { error: 'Please enter a valid email address.' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' }

  if (!rateLimit(`signup:${email}`, 5, 15 * 60_000)) {
    return { error: 'Too many attempts. Please try again in a few minutes.' }
  }

  if (await walletStore.getUserByEmail(email)) {
    return { error: 'An account with this email already exists. Try signing in.' }
  }
  if (await walletStore.getUserByUsername(username)) {
    return { error: `@${username} is taken. Try another username.` }
  }

  const id = generateId('usr')
  await walletStore.createUser({
    id,
    name,
    username,
    email,
    passwordHash: hashSecret(password),
    billstackRef: billstackReferenceForUser(id),
  })
  await walletStore.addNotification({
    userId: id,
    title: 'Welcome to Masanawa',
    body: 'Fund your NGN wallet, trade crypto, and send money to any @username — all from your dashboard.',
  })
  await createSessionForUser(id)
  redirect('/auth/pin')
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!EMAIL_RE.test(email) || password.length < 8) {
    return { error: 'Invalid email or password.' }
  }
  if (!rateLimit(`signin:${email}`, 10, 15 * 60_000)) {
    return { error: 'Too many attempts. Please try again in a few minutes.' }
  }

  const user = await walletStore.getUserByEmail(email)
  if (!user || !verifySecret(password, user.passwordHash)) {
    return { error: 'Invalid email or password.' }
  }

  await createSessionForUser(user.id)
  redirect(user.pinHash ? '/dashboard' : '/auth/pin')
}

export async function signOutAction(): Promise<void> {
  await destroySession()
  redirect('/auth/sign-in')
}

export async function setPinAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const user = await requireUser()
  const pin = String(formData.get('pin') ?? '')
  const confirm = String(formData.get('confirmPin') ?? '')

  if (!/^\d{4}$/.test(pin)) return { error: 'PIN must be exactly 4 digits.' }
  if (pin !== confirm) return { error: "PINs don't match. Try again." }

  await walletStore.updateUser(user.id, { pinHash: hashSecret(pin) })
  redirect('/dashboard')
}

/** Verify the signed-in user's PIN. Rate-limited: 5 tries per 5 minutes. */
export async function verifyPin(pin: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser()
  if (!rateLimit(`pin:${user.id}`, 5, 5 * 60_000)) {
    return { ok: false, error: 'Too many PIN attempts. Please wait a few minutes.' }
  }
  if (!user.pinHash) return { ok: false, error: 'No PIN set. Set one in Settings first.' }
  if (!verifySecret(pin, user.pinHash)) return { ok: false, error: 'Incorrect PIN. Try again.' }
  return { ok: true }
}
