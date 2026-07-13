'use server'

// ---------------------------------------------------------------------------
// Auth server actions: sign-up, sign-in, sign-out, PIN set/verify.
// All state lives behind the WalletStore boundary — these work identically
// on the in-memory backend and Postgres.
// ---------------------------------------------------------------------------
import { REFERRAL_BONUS_NGN } from '@/lib/wallet/referrals'
import { billstackReferenceForUser, walletStore } from '@/lib/wallet/store'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  generateId,
  generateOtp,
  generateResetToken,
  hashSecret,
  sha256Hex,
  verifySecret,
} from './crypto'
import { sendAuthEmail } from './email'
import { rateLimit } from './rate-limit'
import { createSessionForUser, destroySession, requireUser } from './session'

export interface AuthFormState {
  error?: string
  success?: string
}

const EMAIL_RE = /\S+@\S+\.\S+/
const USERNAME_RE = /^[a-z0-9_]{3,20}$/

const OTP_TTL_MS = 10 * 60_000
const RESET_TTL_MS = 30 * 60_000
const MAX_OTP_ATTEMPTS = 5

/** Issue a fresh 6-digit email-verification OTP and email it to the user. */
async function issueEmailOtp(userId: string, email: string): Promise<void> {
  await walletStore.deleteAuthTokensForUser(userId, 'email_verify')
  const code = generateOtp(6)
  await walletStore.createAuthToken({
    id: generateId('otp'),
    userId,
    kind: 'email_verify',
    secretHash: sha256Hex(code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    attempts: 0,
  })
  await sendAuthEmail({
    to: email,
    subject: 'Your Masanawa verification code',
    text: `Your Masanawa verification code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
  })
}

/** Absolute origin of the current request, for building email links. */
async function requestOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? (process.env.NODE_ENV === 'production' ? 'https' : 'http')
  return `${proto}://${host}`
}

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

  // Attribute the sign-up to a referrer if a valid, non-self referral code
  // (the referrer's @username) was supplied. Failures never block sign-up.
  const refCode = String(formData.get('ref') ?? '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase()
  if (refCode && refCode !== username) {
    const referrer = await walletStore.getUserByUsername(refCode)
    if (referrer && referrer.id !== id) {
      await walletStore.recordReferral(referrer.id, id, REFERRAL_BONUS_NGN)
    }
  }

  await walletStore.addNotification({
    userId: id,
    title: 'Welcome to Masanawa',
    body: 'Fund your NGN wallet, trade crypto, and send money to any @username — all from your dashboard.',
  })
  await issueEmailOtp(id, email)
  await createSessionForUser(id)
  redirect('/auth/verify')
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
  if (!user.emailVerified) {
    await issueEmailOtp(user.id, user.email)
    redirect('/auth/verify')
  }
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

/** Confirm the signed-in user's email with the 6-digit OTP they were sent. */
export async function verifyEmailAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const user = await requireUser()
  if (user.emailVerified) redirect('/auth/pin')

  const code = String(formData.get('code') ?? '').trim()
  if (!/^\d{6}$/.test(code)) return { error: 'Enter the 6-digit code from your email.' }

  if (!rateLimit(`verify:${user.id}`, 10, 15 * 60_000)) {
    return { error: 'Too many attempts. Please try again in a few minutes.' }
  }

  const token = await walletStore.getLatestAuthToken(user.id, 'email_verify')
  if (!token || new Date(token.expiresAt) < new Date()) {
    return { error: 'That code has expired. Request a new one below.' }
  }
  if (token.attempts >= MAX_OTP_ATTEMPTS) {
    return { error: 'Too many incorrect attempts. Request a new code below.' }
  }
  if (sha256Hex(code) !== token.secretHash) {
    await walletStore.incrementAuthTokenAttempts(token.id)
    return { error: 'Incorrect code. Please try again.' }
  }

  await walletStore.updateUser(user.id, { emailVerified: true })
  await walletStore.deleteAuthTokensForUser(user.id, 'email_verify')
  redirect('/auth/pin')
}

/** Re-send the email-verification OTP. Rate-limited to curb abuse. */
export async function resendOtpAction(): Promise<AuthFormState> {
  const user = await requireUser()
  if (user.emailVerified) return { success: 'Your email is already verified.' }
  if (!rateLimit(`resend:${user.id}`, 3, 10 * 60_000)) {
    return { error: 'Please wait a few minutes before requesting another code.' }
  }
  await issueEmailOtp(user.id, user.email)
  return { success: 'A new code is on its way.' }
}

/**
 * Begin a password reset. Always reports success so the endpoint can't be used
 * to discover which emails have accounts (no user enumeration).
 */
export async function requestPasswordResetAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!EMAIL_RE.test(email)) return { error: 'Please enter a valid email address.' }

  if (!rateLimit(`reset-req:${email}`, 5, 15 * 60_000)) {
    return { error: 'Too many requests. Please try again in a few minutes.' }
  }

  const user = await walletStore.getUserByEmail(email)
  if (user) {
    await walletStore.deleteAuthTokensForUser(user.id, 'password_reset')
    const rawToken = generateResetToken()
    await walletStore.createAuthToken({
      id: generateId('rst'),
      userId: user.id,
      kind: 'password_reset',
      secretHash: sha256Hex(rawToken),
      expiresAt: new Date(Date.now() + RESET_TTL_MS).toISOString(),
      attempts: 0,
    })
    const origin = await requestOrigin()
    const link = `${origin}/auth/reset-password?token=${rawToken}`
    await sendAuthEmail({
      to: user.email,
      subject: 'Reset your Masanawa password',
      text: `We received a request to reset your password. Open this link to choose a new one (expires in 30 minutes):\n\n${link}\n\nIf you didn't request this, you can safely ignore this email.`,
    })
  }

  return { success: 'sent' }
}

/** Complete a password reset using the token from the emailed link. */
export async function resetPasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const token = String(formData.get('token') ?? '')
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirmPassword') ?? '')

  if (!token) return { error: 'This reset link is invalid. Request a new one.' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' }
  if (password !== confirm) return { error: "Passwords don't match. Try again." }

  const record = await walletStore.getAuthTokenBySecret(sha256Hex(token), 'password_reset')
  if (!record || new Date(record.expiresAt) < new Date()) {
    return { error: 'This reset link has expired. Request a new one.' }
  }

  await walletStore.updateUser(record.userId, { passwordHash: hashSecret(password) })
  await walletStore.deleteAuthTokensForUser(record.userId, 'password_reset')
  redirect('/auth/sign-in?reset=1')
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
