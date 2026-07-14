import { AdminHeader, StatCard, relativeTime } from '@/components/admin/primitives'
import { requireAdmin } from '@/lib/auth/session'
import { formatAsset, formatMsn, type AssetSymbol } from '@/lib/wallet/assets'
import { walletStore } from '@/lib/wallet/store'
import Link from 'next/link'

export default async function AdminP2PPage() {
  await requireAdmin()
  const [openOrders, disputes, activeOffers] = await Promise.all([
    walletStore.listP2POrders({ status: 'open', limit: 20 }),
    walletStore.listP2PDisputes({ status: 'open', limit: 20 }),
    walletStore.listP2POffers({ status: 'active', limit: 20 }),
  ])

  return (
    <div className="flex flex-col gap-6">
      <AdminHeader
        title="P2P Console"
        description="Live overview of the P2P marketplace — open orders, active offers, and disputes requiring resolution."
      />

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Open orders" value={String(openOrders.length)} />
        <StatCard label="Active offers" value={String(activeOffers.length)} />
        <StatCard label="Open disputes" value={String(disputes.length)} />
      </section>

      {/* Open disputes */}
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-foreground">Open disputes</h2>
        {disputes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No open disputes.</p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-border bg-card">
            {disputes.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{d.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    Order {d.orderId.slice(0, 16)}… · {relativeTime(d.createdAt)}
                  </p>
                </div>
                <Link
                  href={`/admin/p2p/disputes/${d.id}`}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Resolve
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Open orders */}
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-foreground">Open orders</h2>
        {openOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No open orders.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Order ID</th>
                  <th className="px-5 py-3 font-medium">Asset</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                  <th className="px-5 py-3 text-right font-medium">Total (MSN)</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {openOrders.map((o) => (
                  <tr key={o.id} className="border-b border-border last:border-b-0">
                    <td className="px-5 py-3 font-mono text-xs">{o.id.slice(0, 16)}…</td>
                    <td className="px-5 py-3 font-medium">{o.asset}</td>
                    <td className="px-5 py-3 text-right font-mono">{o.amount}</td>
                    <td className="px-5 py-3 text-right font-mono">{formatMsn(o.totalMsn)}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{relativeTime(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
