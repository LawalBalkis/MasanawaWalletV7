'use client'

import { Button } from '@/components/ui/button'
import { FlowHeader } from '@/components/wallet/flow-header'
import { FlowSuccess } from '@/components/wallet/flow-success'
import { PinDialog } from '@/components/wallet/pin-dialog'
import { ReviewCard } from '@/components/wallet/review-card'
import { useToast } from '@/components/wallet/toast'
import {
  WALLET_ASSETS,
  assetBySymbol,
  formatAsset,
  formatNgn,
  tradeFeeNgn,
  type AssetSymbol,
} from '@/lib/wallet/demo-data'
import { useState } from 'react'

const CRYPTO_ASSETS = WALLET_ASSETS.filter((a) => a.symbol !== 'NGN')

type Mode = 'buy' | 'sell'
type Step = 'form' | 'review' | 'done'

export default function TradePage() {
  const [step, setStep] = useState<Step>('form')
  const [pinOpen, setPinOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('buy')
  const [symbol, setSymbol] = useState<AssetSymbol>('USDT')
  const [ngnAmount, setNgnAmount] = useState('')
  const { toast } = useToast()

  const asset = assetBySymbol(symbol)
  const ngn = Number(ngnAmount) || 0
  const fee = ngn > 0 ? tradeFeeNgn(ngn) : 0
  // Buy: fee added on top in NGN. Sell: fee deducted from NGN proceeds.
  const assetAmount = ngn > 0 ? ngn / asset.ngnRate : 0
  const totalNgn = mode === 'buy' ? ngn + fee : ngn - fee
  const valid = ngn >= 1000

  function reset() {
    setNgnAmount('')
    setStep('form')
  }

  if (step === 'done') {
    return (
      <div className="max-w-lg">
        <FlowSuccess
          title={mode === 'buy' ? 'Purchase complete' : 'Sale complete'}
          detail={
            mode === 'buy'
              ? `You bought ${formatAsset(assetAmount, asset)} for ${formatNgn(totalNgn)}`
              : `You sold ${formatAsset(assetAmount, asset)} for ${formatNgn(totalNgn)}`
          }
          onReset={reset}
          resetLabel="Make another trade"
        />
      </div>
    )
  }

  if (step === 'review') {
    return (
      <div className="flex max-w-lg flex-col gap-8">
        <FlowHeader
          title={mode === 'buy' ? 'Review your purchase' : 'Review your sale'}
          description="Check the rate, fee, and totals before you confirm. Rates are locked for this trade."
        />
        <ReviewCard
          rows={[
            { label: mode === 'buy' ? 'You buy' : 'You sell', value: formatAsset(assetAmount, asset) },
            { label: 'Rate', value: `1 ${asset.symbol} = ${formatNgn(asset.ngnRate)}` },
            { label: mode === 'buy' ? 'Cost' : 'Proceeds', value: formatNgn(ngn) },
            { label: 'Fee (1%, min ₦100)', value: formatNgn(fee) },
            {
              label: mode === 'buy' ? 'Total debit' : 'You receive',
              value: formatNgn(totalNgn),
              emphasize: true,
            },
          ]}
          confirmLabel={mode === 'buy' ? `Buy ${asset.symbol}` : `Sell ${asset.symbol}`}
          onConfirm={() => setPinOpen(true)}
          onBack={() => setStep('form')}
        />
        <PinDialog
          open={pinOpen}
          description={`Enter your 4-digit PIN to ${mode} ${formatAsset(assetAmount, asset)}.`}
          onConfirm={() => {
            setPinOpen(false)
            setStep('done')
            toast(
              mode === 'buy' ? 'Purchase complete' : 'Sale complete',
              mode === 'buy'
                ? `You bought ${formatAsset(assetAmount, asset)}.`
                : `You sold ${formatAsset(assetAmount, asset)}.`,
            )
          }}
          onCancel={() => setPinOpen(false)}
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
          if (valid) setStep('review')
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

        <div className="flex flex-col gap-2 rounded-xl bg-secondary/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {mode === 'buy' ? 'You receive' : 'You sell'}
            </span>
            <span className="font-mono text-sm font-semibold text-foreground">
              {assetAmount > 0 ? formatAsset(assetAmount, asset) : `0 ${asset.symbol}`}
            </span>
          </div>
          {ngn > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Fee (1%, min ₦100)</span>
              <span className="font-mono text-xs text-muted-foreground">{formatNgn(fee)}</span>
            </div>
          )}
        </div>

        <Button type="submit" size="lg" disabled={!valid}>
          {mode === 'buy' ? `Review buy ${asset.symbol}` : `Review sell ${asset.symbol}`}
        </Button>
      </form>
    </div>
  )
}
