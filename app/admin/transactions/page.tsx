import { AdminHeader, StatCard, relativeTime } from '@/components/admin/primitives'
import { requireAdmin } from '@/lib/auth/session'
import { formatNgn } from '@/lib/wallet/assets'
import { walletStore, type TransactionListOptions } from '@/lib/wallet/store'
import Link from 'next/link'

const PAGE_SIZE = 50

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  await requireAdmin()
  const params = await searchParams
  const opts: TransactionListOptions = {
    limit: PAGE_SIZE,
    offset: params.page ? (Number(params.page) - 1) * PAGE_SIZE : 0,
    type: params.type || undefined,
    asset: params.asset || undefined,
    status: params.status || undefined,
    userId: params.userId || undefined,
    search: params.search || undefined,
    from: params.from || undefined,
    to: params.to || undefined,
  }

  const [txs, total] = await Promise.all([
    walletStore.listAllTransactions(opts),
    walletStore.countAllTransactions(opts),
  ])
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = params.page ? Number(params.page) : 1

  return (
    <div className="flex flex-col gap-6">
      <AdminHeader
        title="Transactions"
        description="Platform-wide ledger explorer. Filter by type, asset, status, or search by ID, counterparty, note, or username."
      />

      <form className="flex flex-wrap gap-3">
        <input
          name="search"
          defaultValue={params.search ?? ''}
          placeholder="Search ID, counterparty, note, @username…"
          className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
        />
        <select
          name="type"
          defaultValue={params.type ?? ''}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
        >
          <option value="">All types</option>
          <option value="fund">Fund</option>
          <option value="send">Send</option>
          <option value="trade">Trade</option>
          <option value="withdraw">Withdraw</option>
          <option value="admin_credit">Admin credit</option>
          <option value="admin_debit">Admin debit</option>
        </select>
        <select
          name="asset"
          defaultValue={params.asset ?? ''}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
        >
          <option value="">All assets</option>
          <option value="NGN">NGN</option>
          <option value="BTC">BTC</option>
          <option value="ETH">ETH</option>
          <option value="USDT">USDT</option>
          <option value="USDC">USDC</option>
          <option value="SOL">SOL</option>
        </select>
        <select
          name="status"
          defaultValue={params.status ?? ''}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
        >
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Filter
        </button>
      </form>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{total.toLocaleString()} transactions</span>
        {totalPages > 1 && (
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link
                href={`/admin/transactions?${new URLSearchParams({ ...params, page: String(currentPage - 1) }).toString()}`}
                className="text-primary hover:underline"
              >
                ← Prev
              </Link>
            )}
            <span>
              Page {currentPage} of {totalPages}
            </span>
            {currentPage < totalPages && (
              <Link
                href={`/admin/transactions?${new URLSearchParams({ ...params, page: String(currentPage + 1) }).toString()}`}
                className="text-primary hover:underline"
              >
                Next →
              </Link>
            )}
          </div>
        )}
      </div>

      {txs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">No transactions found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">ID</th>
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Asset</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                  <th className="px-5 py-3 text-right font-medium">NGN value</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((tx) => (
                  <tr key={tx.id} className="border-b border-border last:border-b-0">
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{tx.id.slice(0, 16)}…</td>
                    <td className="px-5 py-3">
                      <Link href={`/admin/users/${tx.userId}`} className="text-primary hover:underline">
                        @{tx.username}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{tx.type}</span>
                    </td>
                    <td className="px-5 py-3 font-medium">{tx.asset}</td>
                    <td className="px-5 py-3 text-right font-mono">{tx.amount}</td>
                    <td className="px-5 py-3 text-right font-mono">{formatNgn(Number(tx.ngnValue))}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        tx.status === 'completed' ? 'bg-success/10 text-success' :
                        tx.status === 'pending' ? 'bg-warning/10 text-warning' :
                        'bg-destructive/10 text-destructive'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{relativeTime(tx.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
