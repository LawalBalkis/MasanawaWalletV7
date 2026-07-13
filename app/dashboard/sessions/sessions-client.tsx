'use client'

import { Button } from '@/components/ui/button'
import { revokeOtherSessionsAction } from '@/lib/auth/actions'
import { useActionState } from 'react'

export interface SessionItem {
  tokenHash: string
  ip: string
  userAgent: string
  lastSeenAt: string
  createdAt: string
  isCurrent: boolean
  expiresAt: string
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatUA(ua: string): string {
  if (ua === 'Unknown') return 'Unknown device'
  const browserMatch = ua.match(/(Chrome|Firefox|Safari|Edge|Opera|SamsungBrowser)\/[\d.]+/)
  const osMatch = ua.match(/\(([^)]+)\)/)
  const browser = browserMatch ? browserMatch[1] : ''
  const os = osMatch ? osMatch[1].split(';')[0].trim() : ''
  return [browser, os].filter(Boolean).join(' — ') || ua.slice(0, 80)
}

export function SessionsClient({
  sessions,
  userName,
}: {
  sessions: SessionItem[]
  userName: string
}) {
  const [state, formAction, pending] = useActionState(revokeOtherSessionsAction, {})

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Active sessions
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Devices currently signed in to your Masanawa account.
        </p>
      </header>

      {state.success && (
        <div className="mb-4 rounded-lg border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
          {state.success}
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {sessions.map((s) => (
          <li
            key={s.tokenHash}
            className={`rounded-xl border p-4 ${
              s.isCurrent
                ? 'border-primary/30 bg-primary/5'
                : 'border-border bg-card'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{formatUA(s.userAgent)}</span>
                  {s.isCurrent && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      This device
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {s.ip} · Last active {formatRelative(s.lastSeenAt)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Signed in {formatRelative(s.createdAt)}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {sessions.length > 1 && (
        <form action={formAction} className="mt-6">
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? 'Signing out…' : 'Sign out all other devices'}
          </Button>
        </form>
      )}

      {sessions.length === 0 && (
        <p className="text-sm text-muted-foreground">No active sessions found.</p>
      )}
    </div>
  )
}
