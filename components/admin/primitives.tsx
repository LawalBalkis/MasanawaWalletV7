import type { TierId } from '@/lib/wallet/tiers'

export function AdminHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground text-pretty">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-mono text-2xl font-semibold text-foreground">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function StatusBadge({ status }: { status: 'active' | 'frozen' }) {
  const frozen = status === 'frozen'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        frozen ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
      }`}
    >
      {frozen ? 'Frozen' : 'Active'}
    </span>
  )
}

export function TierBadge({ tier }: { tier: TierId }) {
  return (
    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
      Tier {tier}
    </span>
  )
}

export function RoleBadge({ role }: { role: 'user' | 'admin' | 'superadmin' }) {
  if (role === 'superadmin') {
    return (
      <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
        Super Admin
      </span>
    )
  }
  if (role !== 'admin') return null
  return (
    <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
      Admin
    </span>
  )
}

const ACTION_LABELS: Record<string, string> = {
  'user.freeze': 'Froze account',
  'user.unfreeze': 'Reactivated account',
  'user.tier': 'Changed tier',
  'user.pin_reset': 'Reset PIN',
  'user.email_verify': 'Verified email',
  'balance.credit': 'Credited wallet',
  'balance.debit': 'Debited wallet',
  'config.update': 'Updated platform config',
  'user.role': 'Changed user role',
  'user.force_signout': 'Forced sign-out',
  'announcement.broadcast': 'Broadcast announcement',
  'funding.reassign': 'Reassigned funding',
  'funding.refund': 'Refunded funding',
}

export function auditActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

/** Human-readable one-liner from an audit entry's JSON `detail` string. */
export function auditDetailSummary(action: string, detail: string | null): string {
  if (!detail) return ''
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(detail)
  } catch {
    return ''
  }
  const reason = typeof parsed.reason === 'string' ? parsed.reason : null
  if (action === 'user.tier' && 'from' in parsed && 'to' in parsed) {
    return `Tier ${parsed.from} → Tier ${parsed.to}${reason ? ` · ${reason}` : ''}`
  }
  if ((action === 'balance.credit' || action === 'balance.debit') && 'amount' in parsed) {
    const amt = Number(parsed.amount).toLocaleString('en-NG')
    return `₦${amt}${reason ? ` · ${reason}` : ''}`
  }
  if (action === 'user.email_verify' && typeof parsed.email === 'string') {
    return parsed.email
  }
  if (action === 'user.role' && 'from' in parsed && 'to' in parsed) {
    return `${parsed.from} → ${parsed.to}${reason ? ` · ${reason}` : ''}`
  }
  if (action === 'announcement.broadcast' && 'title' in parsed) {
    return `${parsed.title}${'recipientCount' in parsed ? ` · ${parsed.recipientCount} recipients` : ''}`
  }
  if ((action === 'funding.reassign' || action === 'funding.refund') && 'transactionRef' in parsed) {
    return String(parsed.transactionRef)
  }
  if (action === 'config.update') {
    return Object.keys(parsed).join(', ')
  }
  return reason ?? ''
}

/** Short relative time like "3m ago", "5h ago", "2d ago". */
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}
