// ---------------------------------------------------------------------------
// Cookie-backed sessions. The raw token lives ONLY in an httpOnly cookie;
// the store persists a SHA-256 hash of it. Portable — works identically
// against the in-memory store and Postgres.
// ---------------------------------------------------------------------------
import 'server-only'

import { walletStore, type UserRecord } from '@/lib/wallet/store'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { generateSessionToken, hashSessionToken } from './crypto'

export const SESSION_COOKIE = 'masanawa_session'
const SESSION_DAYS = 30

export async function createSessionForUser(userId: string): Promise<void> {
  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000)
  await walletStore.createSession({
    tokenHash: hashSessionToken(token),
    userId,
    expiresAt: expiresAt.toISOString(),
  })
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token) {
    await walletStore.deleteSession(hashSessionToken(token))
  }
  cookieStore.delete(SESSION_COOKIE)
}

/** The signed-in user for this request, or null. Deduped per request. */
export const getCurrentUser = cache(async (): Promise<UserRecord | null> => {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  const session = await walletStore.getSession(hashSessionToken(token))
  if (!session) return null
  return walletStore.getUserById(session.userId)
})

/** Like getCurrentUser but throws if unauthenticated (for server actions). */
export async function requireUser(): Promise<UserRecord> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  return user
}

/**
 * The signed-in admin for this request, or null. Used by the /admin console to
 * gate access — a non-admin (or signed-out) session returns null so callers can
 * redirect. Deduped per request via getCurrentUser.
 */
export async function getCurrentAdmin(): Promise<UserRecord | null> {
  const user = await getCurrentUser()
  return user && user.role === 'admin' ? user : null
}

/** Like requireUser but also requires the admin role (for admin server actions). */
export async function requireAdmin(): Promise<UserRecord> {
  const user = await requireUser()
  if (user.role !== 'admin') throw new Error('Not authorized')
  return user
}
