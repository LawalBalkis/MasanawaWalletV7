// ---------------------------------------------------------------------------
// WalletStore — the single persistence boundary for real wallet data.
//
// ⚠️ SWAP POINT: when a database (Neon + Drizzle) is connected later, replace
// only the `InMemoryWalletStore` implementation below with a DB-backed one.
// Nothing else in the Billstack layer, webhook route, or fund page needs to
// change — they all depend on the `WalletStore` interface.
//
// Until then, funding records live in module-level memory and reset on
// redeploy / cold start. Virtual accounts themselves are durable because
// Billstack stores them — they are recovered by deterministic reference via
// the Get Account API, never duplicated.
// ---------------------------------------------------------------------------
import 'server-only'

/** A recorded wallet funding (a payment into the user's virtual account). */
export interface FundingRecord {
  /** Interbank reference — unique per payment, used for idempotency. */
  transactionRef: string
  /** The virtual account merchant reference the payment came into. */
  accountReference: string
  /** Amount in NGN. */
  amount: number
  payerName: string
  payerAccountNumber: string
  receivedAt: string
}

export interface WalletStore {
  /** Record a funding. Returns false if transactionRef was already recorded (idempotent). */
  recordFunding(record: FundingRecord): Promise<boolean>
  /** Whether a transaction has already been processed. */
  hasFunding(transactionRef: string): Promise<boolean>
  /** All fundings recorded for a virtual account reference, newest first. */
  listFundings(accountReference: string): Promise<FundingRecord[]>
  /** Total NGN credited for a virtual account reference. */
  getFundedTotal(accountReference: string): Promise<number>
}

// ---------------------------------------------------------------------------
// In-memory implementation (default until a database is connected).
// ---------------------------------------------------------------------------

const fundingsByRef = new Map<string, FundingRecord>()

class InMemoryWalletStore implements WalletStore {
  async recordFunding(record: FundingRecord): Promise<boolean> {
    if (fundingsByRef.has(record.transactionRef)) return false
    fundingsByRef.set(record.transactionRef, record)
    return true
  }

  async hasFunding(transactionRef: string): Promise<boolean> {
    return fundingsByRef.has(transactionRef)
  }

  async listFundings(accountReference: string): Promise<FundingRecord[]> {
    return [...fundingsByRef.values()]
      .filter((f) => f.accountReference === accountReference)
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
  }

  async getFundedTotal(accountReference: string): Promise<number> {
    const fundings = await this.listFundings(accountReference)
    return fundings.reduce((sum, f) => sum + f.amount, 0)
  }
}

export const walletStore: WalletStore = new InMemoryWalletStore()

// ---------------------------------------------------------------------------
// Deterministic Billstack reference for the current user.
//
// Billstack requires a unique `reference` per reserved account. By deriving it
// deterministically from the user identity, the app can always recover an
// existing account from Billstack (Get Account API) instead of creating
// duplicates — even after a redeploy with no database.
//
// ⚠️ SWAP POINT: when real auth is added, derive this from the session user id.
// ---------------------------------------------------------------------------

export function billstackReferenceForUser(userId: string): string {
  // Lowercase alphanumeric + underscores only, stable across calls.
  const clean = userId.toLowerCase().replace(/[^a-z0-9]/g, '_')
  return `masanawa_${clean}`
}

/**
 * The current user id. Single demo user until real auth is connected.
 * ⚠️ SWAP POINT: replace with the authenticated session's user id.
 */
export function getCurrentUserId(): string {
  return 'adaeze'
}
