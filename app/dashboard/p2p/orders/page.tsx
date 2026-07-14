import { requireUser } from '@/lib/auth/session'
import { formatAsset, formatMsn, type AssetSymbol } from '@/lib/wallet/assets'
import { walletStore } from '@/lib/wallet/store'
import Link from 'next/link'

export default async function MyOrdersPage() {
  const user = await requireUser()
  const orders = await walletStore.listP2POrders({ userId: user.id, limit: 50 })

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">My Orders</h1>
      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">No orders yet. Browse the marketplace to start trading.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Order</th>
                <th className="px-5 py-3 font-medium">Asset</th>
                <th className="px-5 py-3 text-right font-medium">Amount</th>
                <th className="px-5 py-3 text-right font-medium">Total (MSN)</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-3">
                    <Link href={`/dashboard/p2p/orders/${o.id}`} className="font-mono text-xs text-primary hover:underline">
                      {o.id.slice(0, 16)}…
                    </Link>
                  </td>
                  <td className="px-5 py-3 font-medium">{o.asset}</td>
                  <td className="px-5 py-3 text-right font-mono">{o.amount}</td>
                  <td className="px-5 py-3 text-right font-mono">{formatMsn(o.totalMsn)}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      o.status === 'completed' ? 'bg-success/10 text-success' :
                      o.status === 'open' ? 'bg-warning/10 text-warning' :
                      o.status === 'disputed' ? 'bg-destructive/10 text-destructive' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">
                    {new Date(o.createdAt).toLocaleDateString('en-NG')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
