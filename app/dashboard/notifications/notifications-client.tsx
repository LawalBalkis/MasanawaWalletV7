'use client'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/wallet/empty-state'
import { FlowHeader } from '@/components/wallet/flow-header'
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/lib/wallet/account-actions'
import type { WalletNotification } from '@/lib/wallet/assets'
import { ArrowUpRight, Bell } from 'lucide-react'
import Link from 'next/link'
import { useState, useTransition } from 'react'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function NotificationRow({
  notification,
  onRead,
}: {
  notification: WalletNotification
  onRead: (id: string) => void
}) {
  return (
    <li>
      <div
        className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${
          notification.read ? 'border-border bg-card' : 'border-primary/30 bg-accent/40'
        }`}
      >
        <span
          className={`mt-1.5 size-2 shrink-0 rounded-full ${
            notification.read ? 'bg-transparent' : 'bg-primary'
          }`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-foreground">
              {notification.title}
              {!notification.read && <span className="sr-only"> (unread)</span>}
            </p>
            <time
              dateTime={notification.date}
              className="shrink-0 font-mono text-xs text-muted-foreground"
            >
              {formatDate(notification.date)}
            </time>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground text-pretty">{notification.body}</p>
          <div className="mt-2 flex items-center gap-3">
            {notification.txId && (
              <Link
                href={`/dashboard/activity/${notification.txId}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                View transaction
                <ArrowUpRight className="size-3" aria-hidden="true" />
              </Link>
            )}
            {!notification.read && (
              <button
                type="button"
                onClick={() => onRead(notification.id)}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Mark as read
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

export function NotificationsClient({
  notifications: initial,
}: {
  notifications: WalletNotification[]
}) {
  const [notifications, setNotifications] = useState(initial)
  const [, startTransition] = useTransition()
  const unread = notifications.filter((n) => !n.read).length

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    startTransition(() => {
      void markNotificationReadAction(id)
    })
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    startTransition(() => {
      void markAllNotificationsReadAction()
    })
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <FlowHeader
          title="Notifications"
          description={
            unread > 0
              ? `You have ${unread} unread notification${unread === 1 ? '' : 's'}.`
              : 'You are all caught up.'
          }
        />
        {unread > 0 && (
          <Button variant="secondary" onClick={markAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="Activity on your wallet will show up here."
        />
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Notifications">
          {notifications.map((n) => (
            <NotificationRow key={n.id} notification={n} onRead={markRead} />
          ))}
        </ul>
      )}
    </div>
  )
}
