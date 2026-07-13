'use client'

import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { EmptyState } from '@/components/wallet/empty-state'
import { FlowHeader } from '@/components/wallet/flow-header'
import { TxRow, txTitle } from '@/components/wallet/transaction-list'
import {
  ALL_TRANSACTIONS,
  WALLET_ASSETS,
  type AssetSymbol,
  type TxType,
} from '@/lib/wallet/demo-data'
import { SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'

const TYPE_OPTIONS: { value: TxType | 'all'; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'fund', label: 'Funding' },
  { value: 'buy', label: 'Buys' },
  { value: 'sell', label: 'Sells' },
  { value: 'send', label: 'Sent' },
  { value: 'receive', label: 'Received' },
  { value: 'withdraw', label: 'Withdrawals' },
]

export default function ActivityPage() {
  const [type, setType] = useState<TxType | 'all'>('all')
  const [asset, setAsset] = useState<AssetSymbol | 'all'>('all')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ALL_TRANSACTIONS.filter((tx) => {
      if (type !== 'all' && tx.type !== type) return false
      if (asset !== 'all' && tx.asset !== asset) return false
      if (q) {
        const haystack = `${txTitle(tx)} ${tx.note ?? ''} ${tx.counterparty ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [type, asset, query])

  return (
    <div className="flex flex-col gap-8">
      <FlowHeader
        title="Activity"
        description="Every transaction on your wallet — funding, trades, transfers and withdrawals."
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          type="search"
          placeholder="Search by note, name or username"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search transactions"
          className="sm:flex-1"
        />
        <div className="grid grid-cols-2 gap-3 sm:w-72">
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as TxType | 'all')}
            aria-label="Filter by transaction type"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select
            value={asset}
            onChange={(e) => setAsset(e.target.value as AssetSymbol | 'all')}
            aria-label="Filter by asset"
          >
            <option value="all">All assets</option>
            {WALLET_ASSETS.map((a) => (
              <option key={a.symbol} value={a.symbol}>
                {a.symbol}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No transactions found"
          description="Try a different search term or clear the filters to see all of your activity."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {filtered.map((tx) => (
            <li key={tx.id}>
              <TxRow tx={tx} />
            </li>
          ))}
        </ul>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Showing {filtered.length} of {ALL_TRANSACTIONS.length} transactions
      </p>
    </div>
  )
}
