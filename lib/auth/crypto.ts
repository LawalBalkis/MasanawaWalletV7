// ---------------------------------------------------------------------------
// Password / PIN hashing and session tokens using Node's built-in crypto.
// No external dependency — fully portable.
// Format: "scrypt:<saltHex>:<hashHex>"
// ---------------------------------------------------------------------------
import 'server-only'

import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH = 64
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 }

export function hashSecret(secret: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(secret, salt, KEY_LENGTH, SCRYPT_OPTIONS)
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`
}

export function verifySecret(secret: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split(':')
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false
  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(hashHex, 'hex')
  const actual = scryptSync(secret, salt, expected.length, SCRYPT_OPTIONS)
  return timingSafeEqual(actual, expected)
}

/** Raw session token — stored ONLY in the user's cookie. */
export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url')
}

/** SHA-256 of the raw token — what the store persists. */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateId(prefix: string): string {
  return `${prefix}_${randomBytes(10).toString('hex')}`
}

/** SHA-256 hex of an arbitrary secret (used for OTP/reset-token storage). */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/** A cryptographically-random numeric OTP (default 6 digits, zero-padded). */
export function generateOtp(digits = 6): string {
  const max = 10 ** digits
  return String(randomInt(0, max)).padStart(digits, '0')
}

/** A high-entropy, URL-safe token for password-reset links. */
export function generateResetToken(): string {
  return randomBytes(32).toString('base64url')
}
