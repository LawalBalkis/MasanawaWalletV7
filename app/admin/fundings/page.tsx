import { AdminHeader, StatCard, relativeTime } from '@/components/admin/primitives'
import { requireAdmin } from '@/lib/auth/session'
import { formatNgn } from '@/lib/wallet/assets'
import { walletStore } from '@/lib/wallet/store'
import { FundingsClient } from './fundings-client'
import Link from 'next/link'

const PAGE_SIZE = 50

export default async function AdminFundingsPage() {
  await requireAdmin()
  const [fundings, stats, users] = await Promise.all([
    walletStore.listAllFundings({ limit: PAGE_SIZE }),
    walletStore.getPlatformStats(),
    walletStore.listUsers({ limit: 500 }),
  ])

  const userOptions = users.map((u) => ({ id: u.id, label: `@${u.username} — ${u.name}` }))

  return (
    <div className="flex flex-col gap-6">
      <AdminHeader
        title="Fundings"
        description="Every bank deposit credited via the Billstack webhook. Unmatched rows can be reassigned to a user or marked as refunded."
      />

      <section aria-label="Funding totals" className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total deposits" value={stats.totalFundings.toLocaleString('en-NG')} />
        <StatCard label="Total value" value={formatNgn(stats.totalFundedNgn)} />
        <StatCard
          label="Average"
          value={formatNgn(stats.totalFundings ? stats.totalFundedNgn / stats.totalFundings : 0)}
        />
      </section>

      {fundings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">No deposits recorded yet.</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Payer</th>
                    <th className="px-5 py-3 font-medium">User</th>
                    <th className="px-5 py-3 font-medium">Reference</th>
                    <th className="px-5 py-3 font-medium">Received</th>
                    <th className="px-5 py-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {fundings.map((f) => (
                    <tr key={f.transactionRef} className="border-b border-border last:border-b-0">
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground">{f.payerName}</p>
                        <p className="font-mono text-xs text-muted-foreground">••{f.payerAccountNumber.slice(-4)}</p>
                      </td>
                      <td className="px-5 py-3">
                        {f.userId ? (
                          <Link href={`/admin/users/${f.userId}`} className="font-mono text-primary hover:underline">
                            @{f.username}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unmatched</span>
                        )}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{f.transactionRef}</td>
                      <td className="px-5 py-3 text-muted-foreground">{relativeTime(f.receivedAt)}</td>
                      <td className="px-5 py-3 text-right font-mono font-semibold text-primary">
                        {formatNgn(f.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <FundingsClient fundings={fundings} userOptions={userOptions} />
        </>
      )}
    </div>
  )
}
