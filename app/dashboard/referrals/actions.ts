'use server'

// ---------------------------------------------------------------------------
// Referral dashboard server action: move the available referral balance into
// the user's NGN wallet. Requires a balance of at least ₦2,000.
// ---------------------------------------------------------------------------
import { requireUser } from '@/lib/auth/session'
import { REFERRAL_WITHDRAW_MIN_NGN } from '@/lib/wallet/referrals'
import { walletStore } from '@/lib/wallet/store'
import { revalidatePath } from 'next/cache'

export interface ReferralWithdrawResult {
  ok: boolean
  error?: string
  amount?: number
}

export async function withdrawReferralAction(): Promise<ReferralWithdrawResult> {
  const user = await requireUser()

  if (user.status === 'frozen') {
    return { ok: false, error: 'Your account is frozen. Contact support to withdraw.' }
  }

  const stats = await walletStore.getReferralStats(user.id)
  const amount = stats.availableNgn

  if (amount < REFERRAL_WITHDRAW_MIN_NGN) {
    return {
      ok: false,
      error: `You need at least ₦${REFERRAL_WITHDRAW_MIN_NGN.toLocaleString(
        'en-NG',
      )} in referral earnings to withdraw.`,
    }
  }

  const txId = `refw_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`
  const ok = await walletStore.withdrawReferralEarnings(user.id, amount, txId)
  if (!ok) {
    return { ok: false, error: 'Could not complete the withdrawal. Please try again.' }
  }

  await walletStore.addNotification({
    userId: user.id,
    title: 'Referral earnings withdrawn',
    body: `₦${amount.toLocaleString('en-NG')} from your referral balance was added to your NGN wallet.`,
    txId,
  })

  revalidatePath('/dashboard/referrals')
  revalidatePath('/dashboard')
  return { ok: true, amount }
}
