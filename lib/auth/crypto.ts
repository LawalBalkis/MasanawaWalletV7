// ---------------------------------------------------------------------------
// Password / PIN hashing and session tokens using Node's built-in crypto.
// No external dependency — fully portable.
// Format: "scrypt:<saltHex>:<hashHex>"
// ---------------------------------------------------------------------------
import 'server-only'

import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

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
