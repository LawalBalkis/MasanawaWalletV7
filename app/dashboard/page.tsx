import { BalanceOverview } from '@/components/wallet/balance-overview'
import { AssetList } from '@/components/wallet/asset-list'
import { TransactionList } from '@/components/wallet/transaction-list'
import { DEMO_USER } from '@/lib/wallet/demo-data'

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground text-balance">
          Welcome back, {DEMO_USER.name.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening with your wallet today.
        </p>
      </header>
      <BalanceOverview />
      <div className="grid gap-8 lg:grid-cols-2">
        <AssetList />
        <TransactionList />
      </div>
    </div>
  )
}
