'use client'

import { openOrderAction } from '@/lib/p2p/engine'
import { formatAsset, formatMsn, formatNgn, type AssetSymbol } from '@/lib/wallet/assets'
import { useState, useTransition } from 'react'
import Link from 'next/link'

export interface MarketplaceOffer {
  id: string
  makerId: string
  side: 'buy' | 'sell'
  asset: string
  priceMsn: number
  totalAmount: number
  remainingAmount: number
  minOrderMsn: number
  maxOrderMsn: number
  terms: string | null
  status: string
  makerName: string
  makerUsername: string
}

export function P2PMarketplaceClient({
  offers,
  userId,
  rates,
}: {
  offers: MarketplaceOffer[]
  userId: string
  rates: Record<string, number>
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [amounts, setAmounts] = useState<Record<string, string>>({})

  function handleOpenOrder(offer: MarketplaceOffer) {
    const amountStr = amounts[offer.id]
    if (!amountStr) return
    const amount = parseFloat(amountStr)
    if (!amount || amount <= 0) return

    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await openOrderAction({ offerId: offer.id, amount })
      if (result.ok) {
        setSuccess(`Order opened. Complete payment in the order room.`)
        setAmounts({})
      } else {
        setError(result.error ?? 'Failed to open order.')
      }
    })
  }

  if (offers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">No active offers. Be the first to create one!</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
          {success}
        </div>
      )}

      <div className="grid gap-4">
        {offers.map((offer) => {
          const isMine = offer.makerId === userId
          const totalMsn = Math.round(offer.priceMsn * offer.remainingAmount * 100) / 100
          return (
            <div key={offer.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      offer.side === 'sell' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
                    }`}>
                      {offer.side === 'sell' ? 'SELL' : 'BUY'}
                    </span>
                    <span className="font-semibold text-foreground">{offer.asset}</span>
                    <span className="text-sm text-muted-foreground">@ {formatMsn(offer.priceMsn)}/{offer.asset}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    by @{offer.makerUsername} · {formatAsset(offer.remainingAmount, { symbol: offer.asset as AssetSymbol, decimals: 8 })} available
                  </p>
                  {offer.terms && (
                    <p className="mt-1 text-xs text-muted-foreground italic">&ldquo;{offer.terms}&rdquo;</p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    placeholder="Amount"
                    step="any"
                    value={amounts[offer.id] ?? ''}
                    onChange={(e) => setAmounts((prev) => ({ ...prev, [offer.id]: e.target.value }))}
                    className="w-28 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"
                    disabled={isMine || pending}
                  />
                  <button
                    onClick={() => handleOpenOrder(offer)}
                    disabled={isMine || pending || !amounts[offer.id]}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                  >
                    {isMine ? 'Your offer' : offer.side === 'sell' ? 'Buy' : 'Sell'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
