import {
  AdminHeader,
  StatCard,
  auditActionLabel,
  auditDetailSummary,
  relativeTime,
} from '@/components/admin/primitives'
import { requireAdmin } from '@/lib/auth/session'
import { formatNgn } from '@/lib/wallet/assets'
import { walletStore } from '@/lib/wallet/store'
import Link from 'next/link'

export default async function AdminOverviewPage() {
  const admin = await requireAdmin()
  const [stats, recentAudit, recentFundings] = await Promise.all([
    walletStore.getPlatformStats(),
    walletStore.listAuditLog({ limit: 6 }),
    walletStore.listAllFundings({ limit: 5 }),
  ])

  return (
    <div className="flex flex-col gap-8">
      <AdminHeader
        title={`Welcome back, ${admin.name.split(' ')[0]}`}
        description="Platform health at a glance. Manage users, review funding activity, and audit every privileged action."
      />

      <section aria-label="Key metrics" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total users" value={stats.totalUsers.toLocaleString('en-NG')} hint={`${stats.adminUsers} admin`} />
        <StatCard label="Frozen" value={stats.frozenUsers.toLocaleString('en-NG')} hint="Accounts on hold" />
        <StatCard label="Transactions" value={stats.totalTransactions.toLocaleString('en-NG')} hint="Ledger rows" />
        <StatCard label="Funded in" value={formatNgn(stats.totalFundedNgn)} hint={`${stats.totalFundings} deposits`} />
      </section>

      <section aria-label="Verification tiers" className="grid grid-cols-3 gap-4">
        {([1, 2, 3] as const).map((tier) => (
          <div key={tier} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tier {tier}</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-foreground">
              {stats.tierCounts[tier].toLocaleString('en-NG')}
            </p>
            <p className="text-xs text-muted-foreground">users</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-label="Recent admin activity" className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Recent admin activity</h2>
            <Link href="/admin/audit" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          {recentAudit.length === 0 ? (
            <p className="text-sm text-muted-foreground">No admin actions logged yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {recentAudit.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{auditActionLabel(entry.action)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      by {entry.actorName}
                      {auditDetailSummary(entry.action, entry.detail)
                        ? ` · ${auditDetailSummary(entry.action, entry.detail)}`
                        : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(entry.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Recent fundings" className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Recent fundings</h2>
            <Link href="/admin/fundings" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          {recentFundings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deposits recorded yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {recentFundings.map((f) => (
                <li key={f.transactionRef} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{f.payerName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {f.username ? `@${f.username}` : 'Unmatched account'} · {relativeTime(f.receivedAt)}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-semibold text-primary">
                    {formatNgn(f.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
