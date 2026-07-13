import { requireUser } from '@/lib/auth/session'
import {
  REFERRAL_BONUS_NGN,
  REFERRAL_QUALIFY_NGN,
  REFERRAL_WITHDRAW_MIN_NGN,
  referralLink,
} from '@/lib/wallet/referrals'
import { walletStore } from '@/lib/wallet/store'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { ReferralsClient } from './referrals-client'

export const metadata: Metadata = {
  title: 'Refer & Earn · Masanawa',
  description: 'Invite friends to Masanawa and earn ₦200 for every friend who funds their wallet.',
}

export const dynamic = 'force-dynamic'

export default async function ReferralsPage() {
  const user = await requireUser()
  const stats = await walletStore.getReferralStats(user.id)

  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'masanawa.app'
  const proto = h.get('x-forwarded-proto') ?? (process.env.NODE_ENV === 'production' ? 'https' : 'http')
  const link = referralLink(`${proto}://${host}`, user.username)

  return (
    <ReferralsClient
      code={user.username}
      link={link}
      stats={stats}
      bonusNgn={REFERRAL_BONUS_NGN}
      qualifyNgn={REFERRAL_QUALIFY_NGN}
      withdrawMinNgn={REFERRAL_WITHDRAW_MIN_NGN}
    />
  )
}
