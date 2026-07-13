// ---------------------------------------------------------------------------
// Verification tiers — the single source of truth for account limits.
//
// Masanawa uses a three-tier KYC model (common for Nigerian fintechs):
//   Tier 1 — NIN or BVN verified (the check done on the Fund page today).
//   Tier 2 — Tier 1 + address verification.
//   Tier 3 — Tier 2 + enhanced due diligence (ID document + selfie).
//
// Every limit and capability gate in the app should read from this file so
// tiers can be tuned in one place.
//
// ⚠️ SWAP POINT: `getCurrentUserTier` returns Tier 1 for the demo user. When
// real auth + KYC records exist, derive the tier from the user's verification
// status in the database.
// ---------------------------------------------------------------------------

export type TierId = 1 | 2 | 3

/** What a tier lets the user do. */
export interface TierCapabilities {
  /** Fund the NGN wallet via the dedicated virtual account. */
  fund: boolean
  /** Buy/sell crypto against NGN. */
  trade: boolean
  /** Send to other Masanawa users by @username. */
  sendInternal: boolean
  /** Receive crypto from external wallets. */
  receiveCrypto: boolean
  /** Withdraw NGN to a Nigerian bank account. */
  withdrawBank: boolean
  /** Withdraw crypto to an external wallet address. */
  withdrawCrypto: boolean
}

export interface VerificationTier {
  id: TierId
  name: string
  /** What the user must complete to reach this tier. */
  requirement: string
  /** Max single NGN withdrawal. `null` = no limit. */
  singleWithdrawalNgn: number | null
  /** Max total NGN withdrawals per day. `null` = no limit. */
  dailyWithdrawalNgn: number | null
  /** Max NGN-equivalent crypto withdrawal per day. `null` = no limit. */
  dailyCryptoWithdrawalNgn: number | null
  /** Max wallet balance in NGN equivalent. `null` = no limit. */
  maxBalanceNgn: number | null
  capabilities: TierCapabilities
}

export const VERIFICATION_TIERS: Record<TierId, VerificationTier> = {
  1: {
    id: 1,
    name: 'Tier 1 — Verified',
    requirement: 'NIN or BVN verified',
    singleWithdrawalNgn: 100_000,
    dailyWithdrawalNgn: 300_000,
    dailyCryptoWithdrawalNgn: 300_000,
    maxBalanceNgn: 1_000_000,
    capabilities: {
      fund: true,
      trade: true,
      sendInternal: true,
      receiveCrypto: true,
      withdrawBank: true,
      // Tier 1 users can withdraw crypto to external wallets (within the
      // daily NGN-equivalent limit above).
      withdrawCrypto: true,
    },
  },
  2: {
    id: 2,
    name: 'Tier 2 — Enhanced',
    requirement: 'Tier 1 + address verification',
    singleWithdrawalNgn: 1_000_000,
    dailyWithdrawalNgn: 5_000_000,
    dailyCryptoWithdrawalNgn: 5_000_000,
    maxBalanceNgn: 10_000_000,
    capabilities: {
      fund: true,
      trade: true,
      sendInternal: true,
      receiveCrypto: true,
      withdrawBank: true,
      withdrawCrypto: true,
    },
  },
  3: {
    id: 3,
    name: 'Tier 3 — Full',
    requirement: 'Tier 2 + ID document and selfie check',
    singleWithdrawalNgn: null,
    dailyWithdrawalNgn: null,
    dailyCryptoWithdrawalNgn: null,
    maxBalanceNgn: null,
    capabilities: {
      fund: true,
      trade: true,
      sendInternal: true,
      receiveCrypto: true,
      withdrawBank: true,
      withdrawCrypto: true,
    },
  },
}

/**
 * The current user's tier. Demo user is Tier 1 (they complete NIN/BVN
 * verification on the Fund page).
 * ⚠️ SWAP POINT: read from the user's KYC record once auth + DB exist.
 */
export function getCurrentUserTier(): VerificationTier {
  return VERIFICATION_TIERS[1]
}

/** Human label for a limit value, e.g. "₦300,000" or "No limit". */
export function formatLimit(value: number | null): string {
  if (value === null) return 'No limit'
  return `₦${value.toLocaleString('en-NG')}`
}
