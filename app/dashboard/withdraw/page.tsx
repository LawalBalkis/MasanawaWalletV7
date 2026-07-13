import { WithdrawFlow } from '@/components/wallet/withdraw-flow'
import { requireUser } from '@/lib/auth/session'
import { getHoldings } from '@/lib/wallet/holdings'
import { walletStore } from '@/lib/wallet/store'
import { VERIFICATION_TIERS } from '@/lib/wallet/tiers'

export default async function WithdrawPage() {
  const user = await requireUser()
  const [holdings, beneficiaries] = await Promise.all([
    getHoldings(user.id),
    walletStore.listBeneficiaries(user.id),
  ])
  return (
    <WithdrawFlow
      holdings={holdings}
      tier={VERIFICATION_TIERS[user.tier]}
      beneficiaries={beneficiaries}
    />
  )
}
