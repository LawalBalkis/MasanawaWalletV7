'use client'

import { cancelOrderAction, disputeOrderAction, payOrderAction, sendOrderMessageAction } from '@/lib/p2p/engine'
import { formatMsn } from '@/lib/wallet/assets'
import { useState, useTransition } from 'react'

export interface OrderRoomData {
  id: string
  status: string
  isBuyer: boolean
  totalMsn: number
  feeMsn: number
  amount: number
  asset: string
}

export interface MessageData {
  id: string
  senderId: string
  body: string
  createdAt: string
}

export function OrderRoomClient({
  order,
  messages,
  userId,
}: {
  order: OrderRoomData
  messages: MessageData[]
  userId: string
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [msgBody, setMsgBody] = useState('')
  const [disputeReason, setDisputeReason] = useState('')
  const [showDispute, setShowDispute] = useState(false)

  function handlePay() {
    setError(null)
    startTransition(async () => {
      const result = await payOrderAction({ orderId: order.id, pin })
      if (!result.ok) setError(result.error ?? 'Payment failed.')
      else setPin('')
    })
  }

  function handleCancel() {
    setError(null)
    startTransition(async () => {
      const result = await cancelOrderAction({ orderId: order.id })
      if (!result.ok) setError(result.error ?? 'Cancel failed.')
    })
  }

  function handleDispute() {
    setError(null)
    startTransition(async () => {
      const result = await disputeOrderAction({ orderId: order.id, reason: disputeReason })
      if (result.ok) setShowDispute(false)
      else setError(result.error ?? 'Failed to open dispute.')
    })
  }

  function handleSendMsg() {
    if (!msgBody.trim()) return
    startTransition(async () => {
      const result = await sendOrderMessageAction({ orderId: order.id, body: msgBody })
      if (result.ok) setMsgBody('')
    })
  }

  const isActive = order.status === 'open'

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Actions */}
      {isActive && (
        <div className="flex flex-wrap gap-3">
          {order.isBuyer && (
            <>
              <input
                type="password"
                placeholder="Enter PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={4}
                className="w-32 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
              />
              <button
                onClick={handlePay}
                disabled={pending || !pin}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                Pay {formatMsn(order.totalMsn + order.feeMsn)}
              </button>
            </>
          )}
          <button
            onClick={handleCancel}
            disabled={pending}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-60"
          >
            Cancel order
          </button>
          <button
            onClick={() => setShowDispute(!showDispute)}
            disabled={pending}
            className="rounded-lg border border-destructive/20 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/5 disabled:opacity-60"
          >
            Open dispute
          </button>
        </div>
      )}

      {/* Dispute form */}
      {showDispute && (
        <div className="flex flex-col gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
          <label className="text-sm font-medium text-foreground">Reason for dispute</label>
          <textarea
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            rows={3}
            placeholder="Describe the issue…"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
          />
          <button
            onClick={handleDispute}
            disabled={pending || !disputeReason.trim()}
            className="self-start rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-60"
          >
            Submit dispute
          </button>
        </div>
      )}

      {/* Chat */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">Order chat</h2>
        <div className="flex max-h-80 flex-col gap-2 overflow-y-auto rounded-2xl border border-border bg-card p-4">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                  msg.senderId === userId
                    ? 'self-end bg-primary text-primary-foreground'
                    : 'self-start bg-secondary text-secondary-foreground'
                }`}
              >
                {msg.body}
              </div>
            ))
          )}
        </div>
        {isActive && (
          <div className="flex gap-2">
            <input
              type="text"
              value={msgBody}
              onChange={(e) => setMsgBody(e.target.value)}
              placeholder="Type a message…"
              maxLength={500}
              className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
              onKeyDown={(e) => e.key === 'Enter' && handleSendMsg()}
            />
            <button
              onClick={handleSendMsg}
              disabled={pending || !msgBody.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
