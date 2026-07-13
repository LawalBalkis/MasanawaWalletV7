import {
  RoleBadge,
  StatusBadge,
  TierBadge,
  auditActionLabel,
  auditDetailSummary,
  relativeTime,
} from '@/components/admin/primitives'
import { UserActions, type AdminUserView } from '@/components/admin/user-actions'
import { requireAdmin } from '@/lib/auth/session'
import { formatNgn } from '@/lib/wallet/assets'
import { walletStore } from '@/lib/wallet/store'
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await params
  const user = await walletStore.getUserById(id)
  if (!user) notFound()

  const [balances, recentTx, userAudit] = await Promise.all([
    walletStore.getBalances(user.id),
    walletStore.listTransactions(user.id, 8),
    walletStore.listAuditLog({ targetUserId: user.id, limit: 8 }),
  ])

  const view: AdminUserView = {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    status: user.status,
    tier: user.tier,
    emailVerified: user.emailVerified,
    hasPin: Boolean(user.pinHash),
    ngnBalance: balances.NGN,
  }

  const facts: { label: string; value: React.ReactNode }[] = [
    { label: 'Email', value: user.email },
    { label: 'Phone', value: user.phone || '—' },
    { label: 'NGN balance', value: <span className="font-mono">{formatNgn(balances.NGN)}</span> },
    {
      label: 'Email verified',
      value: user.emailVerified ? (
        <span className="inline-flex items-center gap-1 text-primary">
          <CheckCircle2 className="size-4" aria-hidden="true" /> Yes
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <XCircle className="size-4" aria-hidden="true" /> No
        </span>
      ),
    },
    { label: 'KYC address', value: user.kycAddress || '—' },
    {
      label: 'KYC ID',
      value: user.kycIdType ? `${user.kycIdType} · ${user.kycIdNumber ?? ''}` : '—',
    },
    { label: 'Joined', value: relativeTime(user.createdAt) },
    { label: 'User ID', value: <span className="font-mono text-xs">{user.id}</span> },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/admin/users"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          All users
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-lg font-semibold text-secondary-foreground">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
              {user.name}
              <RoleBadge role={user.role} />
            </h1>
            <p className="font-mono text-sm text-primary">@{user.username}</p>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <StatusBadge status={user.status} />
            <TierBadge tier={user.tier} />
          </div>
        </div>
      </div>

      <section aria-label="Account details" className="rounded-2xl border border-border bg-card p-6">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          {facts.map((f) => (
            <div key={f.label} className="min-w-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {f.label}
              </dt>
              <dd className="mt-1 truncate text-sm text-foreground">{f.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <UserActions user={view} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-label="Recent transactions" className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">Recent transactions</h2>
          {recentTx.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {recentTx.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium capitalize text-foreground">{tx.type}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {tx.note || tx.counterparty || tx.asset} · {relativeTime(tx.date)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 font-mono text-sm font-semibold ${
                      tx.amount >= 0 ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {tx.amount >= 0 ? '+' : '−'}
                    {formatNgn(Math.abs(tx.ngnValue))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Admin history for this user" className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">Admin history</h2>
          {userAudit.length === 0 ? (
            <p className="text-sm text-muted-foreground">No admin actions on this account.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {userAudit.map((entry) => (
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
      </div>
    </div>
  )
}
