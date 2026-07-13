// ---------------------------------------------------------------------------
// Referral program rules and orchestration.
//
//   • Refer a friend with your @username as the referral code.
//   • You earn ₦200 once that friend's cumulative funding reaches ₦2,000.
//   • Earnings accrue to a separate referral balance.
//   • Withdraw to your NGN wallet once the balance reaches ₦2,000 (10 referrals).
//
// All persistence goes through the WalletStore so this works identically on the
// in-memory backend and Postgres.
// ---------------------------------------------------------------------------
import 'server-only'

import { walletStore } from './store'

/** Fixed NGN bonus earned per qualified referral. */
export const REFERRAL_BONUS_NGN = 200
/** Cumulative funding (NGN) an invited user must reach to qualify a referral. */
export const REFERRAL_QUALIFY_NGN = 2_000
/** Minimum referral balance (NGN) required before withdrawing to the wallet. */
export const REFERRAL_WITHDRAW_MIN_NGN = 2_000

/** Build a shareable sign-up link for a referral code (the referrer's username). */
export function referralLink(origin: string, code: string): string {
  return `${origin}/auth/sign-up?ref=${encodeURIComponent(code)}`
}

/**
 * Called after an invited user is credited with a bank funding. If their
 * cumulative funding has crossed the threshold and their referral hasn't
 * qualified yet, mark it qualified and notify the referrer of their bonus.
 * Safe to call on every funding — it no-ops once qualified.
 */
export async function maybeQualifyReferral(referredUserId: string): Promise<void> {
  const referral = await walletStore.getReferralForUser(referredUserId)
  if (!referral || referral.qualified) return

  const referredUser = await walletStore.getUserById(referredUserId)
  if (!referredUser) return

  const fundedTotal = await walletStore.getFundedTotal(referredUser.billstackRef)
  if (fundedTotal < REFERRAL_QUALIFY_NGN) return

  const qualified = await walletStore.qualifyReferral(referredUserId)
  if (!qualified) return

  const referrer = await walletStore.getUserById(qualified.referrerId)
  if (!referrer) return

  await walletStore.addNotification({
    userId: referrer.id,
    title: 'You earned a referral bonus',
    body: `@${referredUser.username} funded their wallet, so you earned ₦${qualified.bonusNgn.toLocaleString(
      'en-NG',
    )}. It's ready in your referral balance.`,
  })
}
