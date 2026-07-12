/**
 * Locally-persisted activity log. Records every send the wallet
 * broadcasts, then confirms it against public RPC (see
 * lib/chains/tx-status.ts). Only PUBLIC data is stored here (addresses,
 * amounts, tx hashes - all already visible on-chain), so plain
 * AsyncStorage is appropriate; SecureStore's per-value size limits make
 * it unsuitable for a growing list.
 */
import AsyncStorage from "@react-native-async-storage/async-storage"

const KEY_ACTIVITY = "wallet.activity.v1"
/** Cap the log so storage cannot grow unbounded. */
const MAX_ENTRIES = 200

export type ActivityStatus = "pending" | "confirmed" | "failed"

export interface ActivityEntry {
  /** Unique id: `${chainId}:${hash}`. */
  id: string
  /** References ChainConfig.id. */
  chainId: string
  /** References TokenConfig.id when a token transfer; undefined = native. */
  tokenId?: string
  direction: "send"
  from: string
  to: string
  /** Amount in the asset's smallest unit, as a decimal string. */
  amountRaw: string
  /** Human-readable amount at time of send. */
  formatted: string
  symbol: string
  /** Transaction hash / signature. */
  hash: string
  /** Epoch ms when the tx was broadcast. */
  timestamp: number
  status: ActivityStatus
}

export async function getActivity(): Promise<ActivityEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_ACTIVITY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ActivityEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function persist(entries: ActivityEntry[]): Promise<void> {
  await AsyncStorage.setItem(KEY_ACTIVITY, JSON.stringify(entries.slice(0, MAX_ENTRIES)))
}

/** Record a freshly-broadcast transaction (newest first). */
export async function recordActivity(entry: Omit<ActivityEntry, "id">): Promise<ActivityEntry> {
  const full: ActivityEntry = { ...entry, id: `${entry.chainId}:${entry.hash}` }
  const existing = await getActivity()
  // Idempotent: replace if the same tx was already recorded.
  const rest = existing.filter((e) => e.id !== full.id)
  await persist([full, ...rest])
  return full
}

/** Update the status of one or more entries by id. */
export async function updateActivityStatuses(updates: Record<string, ActivityStatus>): Promise<ActivityEntry[]> {
  const entries = await getActivity()
  let changed = false
  const next = entries.map((e) => {
    const status = updates[e.id]
    if (status && status !== e.status) {
      changed = true
      return { ...e, status }
    }
    return e
  })
  if (changed) await persist(next)
  return next
}

/** Wipe the log (called on wallet reset). */
export async function clearActivity(): Promise<void> {
  await AsyncStorage.removeItem(KEY_ACTIVITY)
}
