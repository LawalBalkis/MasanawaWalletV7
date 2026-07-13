'use client'

import { Button } from '@/components/ui/button'
import { FlowHeader } from '@/components/wallet/flow-header'
import { FlowSuccess } from '@/components/wallet/flow-success'
import {
  WALLET_ASSETS,
  assetBySymbol,
  formatAsset,
  formatNgn,
  type AssetSymbol,
} from '@/lib/wallet/demo-data'
import { useState } from 'react'

const CRYPTO_ASSETS = WALLET_ASSETS.filter((a) => a.symbol !== 'NGN')

type Mode = 'buy' | 'sell'

export default function TradePage() {
  const [mode, setMode] = useState<Mode>('buy')
  const [symbol, setSymbol] = useState<AssetSymbol>('USDT')
  const [ngnAmount, setNgnAmount] = useState('')
  const [done, setDone] = useState(false)

  const asset = assetBySymbol(symbol)
  const ngn = Number(ngnAmount) || 0
  const assetAmount = ngn > 0 ? ngn / asset.ngnRate : 0
  const valid = ngn >= 1000

  function reset() {
    setNgnAmount('')
    setDone(false)
  }

  if (done) {
    return (
      <div className="max-w-lg">
        <FlowSuccess
          title={mode === 'buy' ? 'Purchase complete' : 'Sale complete'}
          detail={
            mode === 'buy'
              ? `You bought ${formatAsset(assetAmount, asset)} for ${formatNgn(ngn)}`
              : `You sold ${formatAsset(assetAmount, asset)} for ${formatNgn(ngn)}`
          }
          onReset={reset}
          resetLabel="Make another trade"
        />
      </div>
    )
  }

  return (
    <div className="flex max-w-lg flex-col gap-8">
      <FlowHeader
        title="Buy / Sell crypto"
        description="Trade between naira and crypto instantly at the current rate."
      />

      <form
        className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6"
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) setDone(true)
        }}
      >
        <div
          className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1"
          role="tablist"
          aria-label="Trade direction"
        >
          {(['buy', 'sell'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-md py-2 text-sm font-medium capitalize transition-colors ${
                mode === m
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="trade-asset" className="text-sm font-medium text-foreground">
            Asset
          </label>
          <select
            id="trade-asset"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value as AssetSymbol)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {CRYPTO_ASSETS.map((a) => (
              <option key={a.symbol} value={a.symbol}>
                {a.name} ({a.symbol})
              </option>
            ))}
          </select>
          <p className="font-mono text-xs text-muted-foreground">
            1 {asset.symbol} = {formatNgn(asset.ngnRate)}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="trade-amount" className="text-sm font-medium text-foreground">
            Amount in naira
          </label>
          <input
            id="trade-amount"
            type="number"
            inputMode="decimal"
            min={1000}
            placeholder="10,000"
            value={ngnAmount}
            onChange={(e) => setNgnAmount(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <p className="text-xs text-muted-foreground">Minimum {formatNgn(1000)}</p>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3">
          <span className="text-sm text-muted-foreground">
            {mode === 'buy' ? 'You receive' : 'You sell'}
          </span>
          <span className="font-mono text-sm font-semibold text-foreground">
            {assetAmount > 0 ? formatAsset(assetAmount, asset) : `0 ${asset.symbol}`}
          </span>
        </div>

        <Button type="submit" size="lg" disabled={!valid}>
          {mode === 'buy' ? `Buy ${asset.symbol}` : `Sell ${asset.symbol}`}
        </Button>
      </form>
    </div>
  )
}
