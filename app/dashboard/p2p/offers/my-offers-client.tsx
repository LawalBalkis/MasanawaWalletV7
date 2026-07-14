'use client'

import { closeOfferAction, pauseOfferAction } from '@/lib/p2p/engine'
import { formatAsset, formatMsn, type AssetSymbol } from '@/lib/wallet/assets'
import { useTransition } from 'react'

export interface MyOffer {
  id: string
  side: 'buy' | 'sell'
  asset: string
  priceMsn: number
  totalAmount: number
  remainingAmount: number
  status: string
  createdAt: string
}

export function MyOffersClient({ offers }: { offers: MyOffer[] }) {
  const [pending, startTransition] = useTransition()

  function handleAction(id: string, action: 'pause' | 'close') {
    startTransition(async () => {
      if (action === 'pause') await pauseOfferAction({ offerId: id })
      else await closeOfferAction({ offerId: id })
    })
  }

  if (offers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">You haven&apos;t created any offers yet.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {offers.map((offer) => (
        <div key={offer.id} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  offer.side === 'sell' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
                }`}>
                  {offer.side === 'sell' ? 'SELL' : 'BUY'}
                </span>
                <span className="font-semibold text-foreground">{offer.asset}</span>
                <span className="text-sm text-muted-foreground">@ {formatMsn(offer.priceMsn)}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${
                  offer.status === 'active' ? 'bg-success/10 text-success' :
                  offer.status === 'paused' ? 'bg-warning/10 text-warning' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {offer.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatAsset(offer.remainingAmount, { symbol: offer.asset as AssetSymbol, decimals: 8 })} of {formatAsset(offer.totalAmount, { symbol: offer.asset as AssetSymbol, decimals: 8 })} remaining
              </p>
            </div>

            {offer.status === 'active' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction(offer.id, 'pause')}
                  disabled={pending}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-60"
                >
                  Pause
                </button>
                <button
                  onClick={() => handleAction(offer.id, 'close')}
                  disabled={pending}
                  className="rounded-md border border-destructive/20 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/5 disabled:opacity-60"
                >
                  Close
                </button>
              </div>
            )}
            {offer.status === 'paused' && (
              <button
                onClick={() => handleAction(offer.id, 'pause')}
                disabled={pending}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-60"
              >
                Resume
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
