import { AssetList } from '@/components/wallet/asset-list'
import { BalanceOverview } from '@/components/wallet/balance-overview'
import { TransactionList } from '@/components/wallet/transaction-list'
import { requireUser } from '@/lib/auth/session'
import { getHoldings, totalNgnValue } from '@/lib/wallet/holdings'
import { walletStore } from '@/lib/wallet/store'

export default async function DashboardPage() {
  const user = await requireUser()
  const [holdings, transactions] = await Promise.all([
    getHoldings(user.id),
    walletStore.listTransactions(user.id, 6),
  ])
  const total = totalNgnValue(holdings)

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground text-balance">
          Welcome back, {user.name.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening with your wallet today.
        </p>
      </header>
      <BalanceOverview total={total} username={user.username} />
      <div className="grid gap-8 lg:grid-cols-2">
        <AssetList holdings={holdings} />
        <TransactionList transactions={transactions} />
      </div>
    </div>
  )
}
