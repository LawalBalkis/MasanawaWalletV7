import {
  RECENT_TRANSACTIONS,
  assetBySymbol,
  formatAsset,
  formatNgn,
  type TxType,
  type WalletTx,
} from '@/lib/wallet/demo-data'
import {
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
} from 'lucide-react'

const TX_META: Record<TxType, { label: string; icon: typeof Banknote; direction: 'in' | 'out' }> = {
  fund: { label: 'Funded wallet', icon: Banknote, direction: 'in' },
  receive: { label: 'Received', icon: ArrowDownLeft, direction: 'in' },
  buy: { label: 'Bought', icon: ArrowLeftRight, direction: 'in' },
  sell: { label: 'Sold', icon: ArrowLeftRight, direction: 'out' },
  send: { label: 'Sent', icon: ArrowUpRight, direction: 'out' },
  withdraw: { label: 'Withdrew', icon: ArrowDownToLine, direction: 'out' },
}

function txTitle(tx: WalletTx): string {
  const meta = TX_META[tx.type]
  if (tx.counterparty) {
    return tx.type === 'receive'
      ? `${meta.label} from ${tx.counterparty}`
      : `${meta.label} to ${tx.counterparty}`
  }
  return `${meta.label} ${tx.asset}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', {
    month: 'short',
    day: 'numeric',
  })
}

export function TransactionList({ transactions = RECENT_TRANSACTIONS }: { transactions?: WalletTx[] }) {
  return (
    <section aria-labelledby="tx-heading">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="tx-heading" className="text-sm font-medium text-muted-foreground">
          Recent activity
        </h2>
      </div>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {transactions.map((tx) => {
          const meta = TX_META[tx.type]
          const asset = assetBySymbol(tx.asset)
          const isIn = meta.direction === 'in'
          return (
            <li key={tx.id} className="flex items-center gap-4 px-4 py-3.5 sm:px-6">
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                  isIn ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground'
                }`}
                aria-hidden="true"
              >
                <meta.icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{txTitle(tx)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDate(tx.date)}
                  {tx.note ? ` · ${tx.note}` : ''}
                  {tx.status === 'pending' ? ' · Pending' : ''}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`font-mono text-sm font-medium ${
                    isIn ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  {isIn ? '+' : '−'}
                  {formatAsset(tx.amount, asset)}
                </p>
                <p className="font-mono text-xs text-muted-foreground">{formatNgn(tx.ngnValue)}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
