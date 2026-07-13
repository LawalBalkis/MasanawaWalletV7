import { requireUser } from '@/lib/auth/session'
import { walletStore } from '@/lib/wallet/store'
import { SettingsClient, type SettingsUser } from './settings-client'

export default async function SettingsPage() {
  const user = await requireUser()
  const beneficiaries = await walletStore.listBeneficiaries(user.id)

  const settingsUser: SettingsUser = {
    name: user.name,
    username: user.username,
    email: user.email,
    phone: user.phone ?? '',
    tier: user.tier,
    notifyTransactions: user.notifyTransactions,
    notifyPrices: user.notifyPrices,
    notifyProduct: user.notifyProduct,
    twoFactor: user.twoFactor,
    biometric: user.biometric,
  }

  return <SettingsClient user={settingsUser} beneficiaries={beneficiaries} />
}
