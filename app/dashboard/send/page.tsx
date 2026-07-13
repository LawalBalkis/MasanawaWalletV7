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
  resolveUsername,
  type AssetSymbol,
} from '@/lib/wallet/demo-data'
import { useState } from 'react'

type Step = 'form' | 'review' | 'done'

export default function SendPage() {
  const [step, setStep] = useState<Step>('form')
  const [pinOpen, setPinOpen] = useState(false)
  const [recipient, setRecipient] = useState('')
  const [symbol, setSymbol] = useState<AssetSymbol>('USDT')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const { toast } = useToast()

  const asset = assetBySymbol(symbol)
  const amt = Number(amount) || 0
  const handle = recipient.trim().replace(/^@/, '').toLowerCase()
  const resolved = handle.length >= 3 ? resolveUsername(handle) : null
  const valid = handle.length >= 3 && amt > 0 && amt <= asset.balance

  function reset() {
    setRecipient('')
    setAmount('')
    setNote('')
    setStep('form')
  }

  if (step === 'done') {
    return (
      <div className="max-w-lg">
        <FlowSuccess
          title="Sent successfully"
          detail={`${formatAsset(amt, asset)} sent to @${handle}`}
          onReset={reset}
          resetLabel="Send again"
        />
      </div>
    )
  }

  if (step === 'review') {
    return (
      <div className="flex max-w-lg flex-col gap-8">
        <FlowHeader
          title="Review your transfer"
          description="Double-check the details below. Wallet-to-wallet sends are free and instant."
        />
        <ReviewCard
          rows={[
            {
              label: 'Recipient',
              value: resolved ? `${resolved.name} · @${resolved.username}` : `@${handle}`,
            },
            { label: 'Amount', value: formatAsset(amt, asset) },
            { label: 'NGN value', value: formatNgn(amt * asset.ngnRate) },
            { label: 'Fee', value: 'Free' },
            ...(note.trim() ? [{ label: 'Note', value: note.trim() }] : []),
            { label: 'Total debit', value: formatAsset(amt, asset), emphasize: true },
          ]}
          confirmLabel={`Send ${formatAsset(amt, asset)}`}
          onConfirm={() => setPinOpen(true)}
          onBack={() => setStep('form')}
        />
        <PinDialog
          open={pinOpen}
          description={`Enter your 4-digit PIN to send ${formatAsset(amt, asset)} to @${handle}.`}
          onConfirm={() => {
            setPinOpen(false)
            setStep('done')
            toast('Transfer sent', `${formatAsset(amt, asset)} sent to @${handle}.`)
          }}
          onCancel={() => setPinOpen(false)}
        />
      </div>
    )
  }

  return (
    <div className="flex max-w-lg flex-col gap-8">
      <FlowHeader
        title="Send money"
        description="Send naira or crypto to any Masanawa user instantly with just their username. No fees between wallets."
      />

      <form
        className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6"
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) setStep('review')
        }}
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="send-recipient" className="text-sm font-medium text-foreground">
            Recipient username
          </label>
          <input
            id="send-recipient"
            type="text"
            autoComplete="off"
            placeholder="@username"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          {resolved && (
            <p className="text-xs text-primary" role="status">
              {resolved.name} · @{resolved.username}
            </p>
          )}
          {handle.length >= 3 && !resolved && (
            <p className="text-xs text-muted-foreground">
              New recipient — make sure the username is correct.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="send-asset" className="text-sm font-medium text-foreground">
              Asset
            </label>
            <select
              id="send-asset"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value as AssetSymbol)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {WALLET_ASSETS.map((a) => (
                <option key={a.symbol} value={a.symbol}>
                  {a.symbol}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="send-amount" className="text-sm font-medium text-foreground">
              Amount
            </label>
            <input
              id="send-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
        </div>
        <p className="-mt-4 font-mono text-xs text-muted-foreground">
          Available: {formatAsset(asset.balance, asset)}
        </p>

        <div className="flex flex-col gap-2">
          <label htmlFor="send-note" className="text-sm font-medium text-foreground">
            Note <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id="send-note"
            type="text"
            placeholder="What's it for?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        {amt > asset.balance && (
          <p className="text-xs text-destructive" role="alert">
            Amount exceeds your {asset.symbol} balance.
          </p>
        )}

        <Button type="submit" size="lg" disabled={!valid}>
          {valid ? `Review — ${formatAsset(amt, asset)}` : 'Continue'}
        </Button>
      </form>
    </div>
  )
}
