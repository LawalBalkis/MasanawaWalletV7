import 'server-only'

import { getWalletStore } from '@/lib/wallet/store'

const memoryLimiter = globalThis as unknown as {
  __masanawaRateLimits?: Map<string, { count: number; windowStart: number }>
}

function getMemoryMap(): Map<string, { count: number; windowStart: number }> {
  if (!memoryLimiter.__masanawaRateLimits) {
    memoryLimiter.__masanawaRateLimits = new Map()
  }
  return memoryLimiter.__masanawaRateLimits
}

function memoryCheck(key: string, maxAttempts: number, windowMs: number): boolean {
  const map = getMemoryMap()
  const now = Date.now()
  const entry = map.get(key)
  if (!entry || now - entry.windowStart >= windowMs) {
    map.set(key, { count: 1, windowStart: now })
    return true
  }
  if (entry.count >= maxAttempts) {
    return false
  }
  entry.count += 1
  map.set(key, entry)
  return true
}

async function postgresCheck(key: string, maxAttempts: number, windowMs: number): Promise<boolean> {
  const store = getWalletStore()
  const now = Date.now()
  const existing = await store.getRateLimit(key)
  if (!existing || now - new Date(existing.windowStart).getTime() >= windowMs) {
    await store.upsertRateLimit(key, 1, new Date(now).toISOString())
    return true
  }
  if (existing.count >= maxAttempts) {
    return false
  }
  await store.upsertRateLimit(key, existing.count + 1, existing.windowStart)
  return true
}

/**
 * Returns true if the action is allowed, false if rate-limited.
 * Uses Postgres when available (cross-instance), falls back to in-memory.
 */
export async function rateLimit(key: string, maxAttempts: number, windowMs: number): Promise<boolean> {
  if (process.env.DATABASE_URL) {
    try {
      return await postgresCheck(key, maxAttempts, windowMs)
    } catch {
      return memoryCheck(key, maxAttempts, windowMs)
    }
  }
  return memoryCheck(key, maxAttempts, windowMs)
}
