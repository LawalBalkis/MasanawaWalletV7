'use client'

import { Button } from '@/components/ui/button'
import { FlowHeader } from '@/components/wallet/flow-header'
import { FlowSuccess } from '@/components/wallet/flow-success'
import { PinDialog } from '@/components/wallet/pin-dialog'
import { ReviewCard } from '@/components/wallet/review-card'
import { useToast } from '@/components/wallet/toast'
import {
  DEMO_BENEFICIARIES,
  FEES,
  assetBySymbol,
  formatNgn,
  resolveBankAccount,
} from '@/lib/wallet/demo-data'
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

type Step = 'form' | 'review' | 'done'

export default function WithdrawPage() {
  const [step, setStep] = useState<Step>('form')
  const [pinOpen, setPinOpen] = useState(false)
  const [bank, setBank] = useState(BANKS[0])
  const [accountNumber, setAccountNumber] = useState('')
  const [amount, setAmount] = useState('')
  const { toast } = useToast()

  const ngnBalance = assetBySymbol('NGN').balance
  const amt = Number(amount) || 0
  const fee = FEES.withdrawNgn
  const validAccount = /^\d{10}$/.test(accountNumber)
  const accountName = validAccount ? resolveBankAccount(bank, accountNumber) : null
  const valid = validAccount && !!accountName && amt >= 500 && amt + fee <= ngnBalance

  function selectBeneficiary(id: string) {
    const ben = DEMO_BENEFICIARIES.find((b) => b.id === id)
    if (!ben) return
    setBank(ben.bank)
    setAccountNumber(ben.accountNumber)
  }

  function reset() {
    setAccountNumber('')
    setAmount('')
    setStep('form')
  }

  if (step === 'done') {
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

  if (step === 'review') {
    return (
      <div className="flex max-w-lg flex-col gap-8">
        <FlowHeader
          title="Review your withdrawal"
          description="Confirm the destination account and totals before you authorize."
        />
        <ReviewCard
          rows={[
            { label: 'Bank', value: bank },
            { label: 'Account number', value: accountNumber },
            ...(accountName ? [{ label: 'Account name', value: accountName }] : []),
            { label: 'Amount', value: formatNgn(amt) },
            { label: 'Fee', value: formatNgn(fee) },
            { label: 'Total debit', value: formatNgn(amt + fee), emphasize: true },
          ]}
          confirmLabel={`Withdraw ${formatNgn(amt)}`}
          onConfirm={() => setPinOpen(true)}
          onBack={() => setStep('form')}
        />
        <PinDialog
          open={pinOpen}
          description={`Enter your 4-digit PIN to withdraw ${formatNgn(amt)} to ${bank} ••${accountNumber.slice(-4)}.`}
          onConfirm={() => {
            setPinOpen(false)
            setStep('done')
            toast('Withdrawal initiated', `${formatNgn(amt)} is on its way to ${bank}.`)
          }}
          onCancel={() => setPinOpen(false)}
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
          if (valid) setStep('review')
        }}
      >
        <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3">
          <span className="text-sm text-muted-foreground">Naira balance</span>
          <span className="font-mono text-sm font-semibold text-foreground">
            {formatNgn(ngnBalance)}
          </span>
        </div>

        {DEMO_BENEFICIARIES.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">Saved accounts</p>
            <div className="flex flex-wrap gap-2">
              {DEMO_BENEFICIARIES.map((ben) => {
                const active = ben.bank === bank && ben.accountNumber === accountNumber
                return (
                  <button
                    key={ben.id}
                    type="button"
                    onClick={() => selectBeneficiary(ben.id)}
                    aria-pressed={active}
                    className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                      active
                        ? 'border-primary bg-accent text-accent-foreground'
                        : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    }`}
                  >
                    <span className="block font-medium">{ben.bank}</span>
                    <span className="font-mono">••{ben.accountNumber.slice(-4)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

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
          {accountName && (
            <p className="text-xs text-primary" role="status">
              {accountName}
            </p>
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
          <p className="text-xs text-muted-foreground">
            Minimum {formatNgn(500)} · Fee {formatNgn(fee)}
          </p>
        </div>

        {amt + fee > ngnBalance && amt > 0 && (
          <p className="text-xs text-destructive" role="alert">
            Amount plus the {formatNgn(fee)} fee exceeds your naira balance.
          </p>
        )}

        <Button type="submit" size="lg" disabled={!valid}>
          {valid ? `Review — ${formatNgn(amt)}` : 'Continue'}
        </Button>
      </form>
    </div>
  )
}
