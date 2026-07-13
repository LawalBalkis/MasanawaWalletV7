// ---------------------------------------------------------------------------
// Minimal in-memory sliding-window rate limiter for auth and money actions.
// Per-instance only — good enough for abuse throttling without an extra
// dependency. Swap for Redis-backed limiting if you need cross-instance state.
// ---------------------------------------------------------------------------
import 'server-only'

interface Window {
  timestamps: number[]
}

const globalLimiter = globalThis as unknown as {
  __masanawaRateLimits?: Map<string, Window>
}

function getWindows(): Map<string, Window> {
  if (!globalLimiter.__masanawaRateLimits) {
    globalLimiter.__masanawaRateLimits = new Map()
  }
  return globalLimiter.__masanawaRateLimits
}

/**
 * Returns true if the action is allowed, false if rate-limited.
 * `key` should namespace the action + subject, e.g. "signin:user@x.com".
 */
export function rateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const windows = getWindows()
  const now = Date.now()
  const entry = windows.get(key) ?? { timestamps: [] }
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs)
  if (entry.timestamps.length >= maxAttempts) {
    windows.set(key, entry)
    return false
  }
  entry.timestamps.push(now)
  windows.set(key, entry)
  return true
}
