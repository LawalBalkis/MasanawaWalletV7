'use client'

import { AdminHeader } from '@/components/admin/primitives'
import { broadcastAnnouncementAction } from '@/lib/wallet/admin-actions'
import { useActionState, useState } from 'react'

export function AnnouncementsClient() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [state, formAction, pending] = useActionState(
    async (_prev: { ok: boolean; error?: string }, formData: FormData) => {
      return broadcastAnnouncementAction({
        title: String(formData.get('title') ?? ''),
        body: String(formData.get('body') ?? ''),
      })
    },
    { ok: true },
  )

  return (
    <div className="flex flex-col gap-6">
      <AdminHeader
        title="Broadcast announcement"
        description="Send a notification to every user on the platform. Use sparingly — this reaches all accounts."
      />

      {state.ok === false && state.error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}
      {state.ok === true && (state as any).error === undefined && pending === false && title && (
        <div className="rounded-lg border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
          Announcement sent to all users.
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="ann-title" className="text-sm font-medium text-foreground">
            Title
          </label>
          <input
            id="ann-title"
            name="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. New feature: Price alerts"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="ann-body" className="text-sm font-medium text-foreground">
            Message
          </label>
          <textarea
            id="ann-body"
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your announcement…"
            rows={5}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
            required
          />
        </div>
        <button
          type="submit"
          disabled={pending || !title.trim() || !body.trim()}
          className="self-start rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {pending ? 'Sending…' : 'Broadcast to all users'}
        </button>
      </form>
    </div>
  )
}
