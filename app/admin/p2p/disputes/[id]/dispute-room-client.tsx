'use client'

import { resolveDisputeAction } from '@/lib/p2p/admin-actions'
import { useState, useTransition } from 'react'

export function DisputeRoomClient({
  disputeId,
  orderId,
  reason,
  openedByUsername,
  messages,
}: {
  disputeId: string
  orderId: string
  reason: string
  openedByUsername: string
  messages: { id: string; senderId: string; body: string; createdAt: string }[]
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')

  function handleResolve(resolution: 'resolved_release' | 'resolved_refund') {
    if (!note.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await resolveDisputeAction({ disputeId, resolution, note })
      if (!result.ok) setError(result.error ?? 'Failed to resolve.')
      else setNote('')
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">Dispute details</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Opened by</dt>
            <dd className="mt-1 text-sm text-foreground">@{openedByUsername}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Order</dt>
            <dd className="mt-1 font-mono text-xs text-foreground">{orderId.slice(0, 20)}…</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs font-medium uppercase text-muted-foreground">Reason</dt>
            <dd className="mt-1 text-sm text-foreground">{reason}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">Order chat</h2>
        <div className="mt-4 flex max-h-60 flex-col gap-2 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages in this order.</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="rounded-xl bg-secondary px-3 py-2 text-sm text-secondary-foreground">
                {m.body}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">Resolve dispute</h2>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Resolution note (required)…"
          rows={3}
          className="mt-4 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"
        />
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => handleResolve('resolved_release')}
            disabled={pending || !note.trim()}
            className="rounded-lg bg-success px-5 py-2 text-sm font-medium text-success-foreground hover:opacity-90 disabled:opacity-60"
          >
            Release to buyer
          </button>
          <button
            onClick={() => handleResolve('resolved_refund')}
            disabled={pending || !note.trim()}
            className="rounded-lg bg-destructive px-5 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-60"
          >
            Refund to seller
          </button>
        </div>
      </div>
    </div>
  )
}
