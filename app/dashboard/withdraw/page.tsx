'use client'

import { Button } from '@/components/ui/button'
import { FlowHeader } from '@/components/wallet/flow-header'
import { FlowSuccess } from '@/components/wallet/flow-success'
import { assetBySymbol, formatNgn } from '@/lib/wallet/demo-data'
import { useState } from 'react'

const BANKS = [
  'Access Bank',
  'First Bank',
  'GTBank',
  'Kuda',
  'Moniepoint',
  'Opay',
  'UBA',
  'Wema Bank',
  'Zenith Bank',
]

export default function WithdrawPage() {
  const [bank, setBank] = useState(BANKS[0])
  const [accountNumber, setAccountNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [done, setDone] = useState(false)

  const ngnBalance = assetBySymbol('NGN').balance
  const amt = Number(amount) || 0
  const validAccount = /^\d{10}$/.test(accountNumber)
  const valid = validAccount && amt >= 500 && amt <= ngnBalance

  function reset() {
    setAccountNumber('')
    setAmount('')
    setDone(false)
  }

  if (done) {
    return (
      <div className="max-w-lg">
        <FlowSuccess
          title="Withdrawal initiated"
          detail={`${formatNgn(amt)} on its way to ${bank} ••${accountNumber.slice(-4)}`}
          onReset={reset}
          resetLabel="New withdrawal"
        />
      </div>
    )
  }

  return (
    <div className="flex max-w-lg flex-col gap-8">
      <FlowHeader
        title="Withdraw to bank"
        description="Move naira from your wallet to any Nigerian bank account. Withdrawals typically arrive within minutes."
      />

      <form
        className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6"
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) setDone(true)
        }}
      >
        <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3">
          <span className="text-sm text-muted-foreground">Naira balance</span>
          <span className="font-mono text-sm font-semibold text-foreground">
            {formatNgn(ngnBalance)}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="withdraw-bank" className="text-sm font-medium text-foreground">
            Bank
          </label>
          <select
            id="withdraw-bank"
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {BANKS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="withdraw-account" className="text-sm font-medium text-foreground">
            Account number
          </label>
          <input
            id="withdraw-account"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={10}
            placeholder="0123456789"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
            className="h-10 rounded-lg border border-input bg-background px-3 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          {accountNumber.length > 0 && !validAccount && (
            <p className="text-xs text-muted-foreground">Account number must be 10 digits.</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="withdraw-amount" className="text-sm font-medium text-foreground">
            Amount
          </label>
          <input
            id="withdraw-amount"
            type="number"
            inputMode="decimal"
            min={500}
            placeholder="50,000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <p className="text-xs text-muted-foreground">Minimum {formatNgn(500)}</p>
        </div>

        {amt > ngnBalance && (
          <p className="text-xs text-destructive" role="alert">
            Amount exceeds your naira balance.
          </p>
        )}

        <Button type="submit" size="lg" disabled={!valid}>
          {valid ? `Withdraw ${formatNgn(amt)}` : 'Withdraw'}
        </Button>
      </form>
    </div>
  )
}
