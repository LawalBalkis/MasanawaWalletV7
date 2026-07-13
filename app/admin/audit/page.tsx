import { AdminHeader, auditActionLabel, auditDetailSummary, relativeTime } from '@/components/admin/primitives'
import { requireAdmin } from '@/lib/auth/session'
import { walletStore, type AuditListOptions } from '@/lib/wallet/store'
import Link from 'next/link'

const PAGE_SIZE = 100

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  await requireAdmin()
  const params = await searchParams
  const opts: AuditListOptions = {
    limit: PAGE_SIZE,
    offset: params.page ? (Number(params.page) - 1) * PAGE_SIZE : 0,
    action: params.action || undefined,
    targetUserId: params.targetUserId || undefined,
    search: params.search || undefined,
    from: params.from || undefined,
    to: params.to || undefined,
  }

  const [entries, total] = await Promise.all([
    walletStore.listAuditLog(opts),
    walletStore.countAuditLog(opts),
  ])
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = params.page ? Number(params.page) : 1

  function csvUrl() {
    if (entries.length === 0) return ''
    const rows = entries.map((e) => ({
      id: e.id,
      actor: e.actorName,
      action: e.action,
      targetUserId: e.targetUserId ?? '',
      detail: e.detail ?? '',
      ip: e.ip ?? '',
      userAgent: e.userAgent ?? '',
      createdAt: e.createdAt,
    }))
    const headers = Object.keys(rows[0])
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => JSON.stringify((r as any)[h] ?? '')).join(','))].join('\n')
    return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminHeader
        title="Audit log"
        description="Append-only record of every privileged action — freezes, tier changes, PIN resets, config updates, and more."
      />

      <form className="flex flex-wrap gap-3">
        <input
          name="search"
          defaultValue={params.search ?? ''}
          placeholder="Search actor, action, detail…"
          className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
        />
        <select
          name="action"
          defaultValue={params.action ?? ''}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
        >
          <option value="">All actions</option>
          <option value="user.freeze">Freeze</option>
          <option value="user.unfreeze">Unfreeze</option>
          <option value="user.tier">Tier change</option>
          <option value="user.pin_reset">PIN reset</option>
          <option value="user.email_verify">Email verify</option>
          <option value="balance.credit">Credit</option>
          <option value="balance.debit">Debit</option>
          <option value="config.update">Config update</option>
          <option value="user.role">Role change</option>
          <option value="user.force_signout">Force sign-out</option>
          <option value="announcement.broadcast">Announcement</option>
          <option value="funding.reassign">Funding reassign</option>
          <option value="funding.refund">Funding refund</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Filter
        </button>
        {entries.length > 0 && (
          <a
            href={csvUrl()}
            download="audit-log.csv"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
          >
            Export CSV
          </a>
        )}
      </form>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{total.toLocaleString()} entries</span>
        {totalPages > 1 && (
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link
                href={`/admin/audit?${new URLSearchParams({ ...params, page: String(currentPage - 1) }).toString()}`}
                className="text-primary hover:underline"
              >
                ← Prev
              </Link>
            )}
            <span>Page {currentPage} of {totalPages}</span>
            {currentPage < totalPages && (
              <Link
                href={`/admin/audit?${new URLSearchParams({ ...params, page: String(currentPage + 1) }).toString()}`}
                className="text-primary hover:underline"
              >
                Next →
              </Link>
            )}
          </div>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">No audit entries found.</p>
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
                    {entry.ip && <span className="ml-2 font-mono">· {entry.ip}</span>}
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
