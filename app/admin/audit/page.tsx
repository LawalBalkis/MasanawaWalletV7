import { AdminHeader, auditActionLabel, auditDetailSummary, relativeTime } from '@/components/admin/primitives'
import { requireAdmin } from '@/lib/auth/session'
import { walletStore } from '@/lib/wallet/store'
import Link from 'next/link'

const PAGE_SIZE = 100

export default async function AdminAuditPage() {
  await requireAdmin()
  const entries = await walletStore.listAuditLog({ limit: PAGE_SIZE })

  return (
    <div className="flex flex-col gap-6">
      <AdminHeader
        title="Audit log"
        description="An append-only record of every privileged action — freezes, tier changes, PIN resets and manual balance adjustments."
      />

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">No admin actions have been logged yet.</p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-card">
          {entries.map((entry) => {
            const summary = auditDetailSummary(entry.action, entry.detail)
            return (
              <li
                key={entry.id}
                className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{auditActionLabel(entry.action)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    by {entry.actorName}
                    {entry.targetUserId ? (
                      <>
                        {' · target '}
                        <Link
                          href={`/admin/users/${entry.targetUserId}`}
                          className="font-mono text-primary hover:underline"
                        >
                          {entry.targetUserId}
                        </Link>
                      </>
                    ) : null}
                  </p>
                  {summary && <p className="mt-0.5 text-xs text-muted-foreground">{summary}</p>}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(entry.createdAt)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
