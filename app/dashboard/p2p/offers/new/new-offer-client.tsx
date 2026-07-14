'use client'

import { createOfferAction } from '@/lib/p2p/engine'
import { formatMsn, formatNgn, type AssetSymbol } from '@/lib/wallet/assets'
import { useActionState, useState } from 'react'

const CRYPTO_ASSETS: AssetSymbol[] = ['USDT', 'USDC', 'BTC', 'ETH', 'SOL']

export function NewOfferClient({ rates }: { rates: Record<string, number> }) {
  const [side, setSide] = useState<'buy' | 'sell'>('sell')
  const [asset, setAsset] = useState<AssetSymbol>('USDT')
  const [priceMsn, setPriceMsn] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [minOrder, setMinOrder] = useState('')
  const [maxOrder, setMaxOrder] = useState('')
  const [terms, setTerms] = useState('')
  const [state, formAction, pending] = useActionState(
    async (_prev: { ok: boolean; error?: string }, _formData: FormData) => {
      return createOfferAction({
        side,
        asset,
        priceMsn: parseFloat(priceMsn),
        totalAmount: parseFloat(totalAmount),
        minOrderMsn: minOrder ? parseFloat(minOrder) : undefined,
        maxOrderMsn: maxOrder ? parseFloat(maxOrder) : undefined,
        terms: terms || undefined,
      })
    },
    { ok: true },
  )

  const marketRate = rates[asset] ?? 0
  const lowerBound = Math.round(marketRate * 0.95 * 100) / 100
  const upperBound = Math.round(marketRate * 1.05 * 100) / 100

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">Create P2P Offer</h1>

      {state.ok === false && state.error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-5">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setSide('sell')}
            className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium ${
              side === 'sell' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
            }`}
          >
            Sell crypto (receive MSN)
          </button>
          <button
            type="button"
            onClick={() => setSide('buy')}
            className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium ${
              side === 'buy' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
            }`}
          >
            Buy crypto (pay MSN)
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Asset</label>
          <select
            value={asset}
            onChange={(e) => {
              setAsset(e.target.value as AssetSymbol)
              setPriceMsn(String(rates[e.target.value as AssetSymbol] ?? ''))
            }}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
          >
            {CRYPTO_ASSETS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Price (MSN per {asset})</label>
          <input
            type="number"
            step="any"
            value={priceMsn}
            onChange={(e) => setPriceMsn(e.target.value)}
            placeholder={String(marketRate)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
          />
          <p className="text-xs text-muted-foreground">
            Market rate: {formatNgn(Math.round(marketRate))} · Allowed range: {formatMsn(lowerBound)}–{formatMsn(upperBound)}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Total amount ({asset})</label>
          <input
            type="number"
            step="any"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Min order (MSN)</label>
            <input
              type="number"
              step="any"
              value={minOrder}
              onChange={(e) => setMinOrder(e.target.value)}
              placeholder="0"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Max order (MSN)</label>
            <input
              type="number"
              step="any"
              value={maxOrder}
              onChange={(e) => setMaxOrder(e.target.value)}
              placeholder="No limit"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Terms (optional)</label>
          <textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="Payment methods, response time, etc."
            rows={3}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
          />
        </div>

        <button
          type="submit"
          disabled={pending || !priceMsn || !totalAmount}
          className="self-start rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {pending ? 'Creating…' : 'Create offer'}
        </button>
      </form>
    </div>
  )
}
