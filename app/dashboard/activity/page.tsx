import { requireUser } from '@/lib/auth/session'
import { walletStore } from '@/lib/wallet/store'
import { ActivityClient } from './activity-client'

export default async function ActivityPage() {
  const user = await requireUser()
  const transactions = await walletStore.listTransactions(user.id)
  return <ActivityClient transactions={transactions} />
}
