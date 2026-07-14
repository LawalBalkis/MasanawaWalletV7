'use client'

import { Button } from '@/components/ui/button'
import { FlowHeader } from '@/components/wallet/flow-header'
import { FlowSuccess } from '@/components/wallet/flow-success'
import { PinDialog } from '@/components/wallet/pin-dialog'
import { ReviewCard } from '@/components/wallet/review-card'
import { useToast } from '@/components/wallet/toast'
import {
  resolveBankAccount,
  withdrawBankAction,
  withdrawCryptoAction,
} from '@/lib/wallet/actions'
import {
  FEES,
  NIGERIAN_BANKS,
  formatAsset,
  formatNgn,
  type AssetHolding,
  type AssetSymbol,
  type Beneficiary,
} from '@/lib/wallet/assets'
import { formatLimit, type VerificationTier } from '@/lib/wallet/tiers'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Mode = 'bank' | 'crypto'
type Step = 'form' | 'review' | 'done'

export function WithdrawFlow({
  holdings,
  tier,
  beneficiaries,
}: {
  holdings: AssetHolding[]
  tier: VerificationTier
  beneficiaries: Beneficiary[]
}) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('bank')
  const [step, setStep] = useState<Step>('form')
  const [pinOpen, setPinOpen] = useState(false)
  const { toast } = useToast()

  // Bank state
  const [bank, setBank] = useState(NIGERIAN_BANKS[0])
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [amount, setAmount] = useState('')

  // Crypto state
  const cryptoAssets = holdings.filter((a) => a.symbol !== 'MSN')
  const [symbol, setSymbol] = useState<AssetSymbol>('USDT')
  const [address, setAddress] = useState('')
  const [cryptoAmount, setCryptoAmount] = useState('')

  const ngnBalance = holdings.find((a) => a.symbol === 'MSN')?.balance ?? 0
  const amt = Number(amount) || 0
  const fee = FEES.withdrawNgn
  const validAccount = /^\d{10}$/.test(accountNumber)
  const withinTierLimit = tier.singleWithdrawalNgn === null || amt <= tier.singleWithdrawalNgn
  const bankValid =
    validAccount && !!accountName && amt >= 500 && amt + fee <= ngnBalance && withinTierLimit

  const cryptoAsset = cryptoAssets.find((a) => a.symbol === symbol) ?? cryptoAssets[0]
  const cAmt = Number(cryptoAmount) || 0
  const cNgnValue = cAmt * cryptoAsset.ngnRate
  const addressValid = address.trim().length >= 20 && !/\s/.test(address.trim())
  const withinCryptoLimit =
    tier.dailyCryptoWithdrawalNgn === null || cNgnValue <= tier.dailyCryptoWithdrawalNgn
  const cryptoValid =
    addressValid && cAmt > 0 && cAmt <= cryptoAsset.balance && withinCryptoLimit

  async function verifyAccount(nextBank: string, nextNumber: string) {
    if (!/^\d{10}$/.test(nextNumber)) {
      setAccountName(null)
      return
    }
    setChecking(true)
    try {
      setAccountName(await resolveBankAccount(nextBank, nextNumber))
    } finally {
      setChecking(false)
    }
  }

  function selectBeneficiary(id: string) {
    const ben = beneficiaries.find((b) => b.id === id)
    if (!ben) return
    setBank(ben.bank)
    setAccountNumber(ben.accountNumber)
    setAccountName(ben.accountName)
  }

  function reset() {
    setAccountNumber('')
    setAccountName(null)
    setAmount('')
    setAddress('')
    setCryptoAmount('')
    setStep('form')
    router.refresh()
  }

  if (step === 'done') {
    return (
      <div className="max-w-lg">
        <FlowSuccess
          title="Withdrawal initiated"
          detail={
            mode === 'bank'
              ? `${formatNgn(amt)} on its way to ${bank} ••${accountNumber.slice(-4)}`
              : `${formatAsset(cAmt, cryptoAsset)} sent to ${address.trim().slice(0, 6)}…${address.trim().slice(-4)}`
          }
          onReset={reset}
          resetLabel="New withdrawal"
        />
      </div>
    )
  }

  if (step === 'review') {
    const rows =
      mode === 'bank'
        ? [
            { label: 'Bank', value: bank },
            { label: 'Account number', value: accountNumber },
            ...(accountName ? [{ label: 'Account name', value: accountName }] : []),
            { label: 'Amount', value: formatNgn(amt) },
            { label: 'Fee', value: formatNgn(fee) },
            { label: 'Total debit', value: formatNgn(amt + fee), emphasize: true },
          ]
        : [
            { label: 'Asset', value: `${cryptoAsset.name} (${cryptoAsset.symbol})` },
            { label: 'Destination', value: `${address.trim().slice(0, 10)}…${address.trim().slice(-8)}` },
            { label: 'Amount', value: formatAsset(cAmt, cryptoAsset) },
            { label: 'NGN value', value: formatNgn(cNgnValue) },
            { label: 'Network fee', value: 'Included' },
            { label: 'Total debit', value: formatAsset(cAmt, cryptoAsset), emphasize: true },
          ]
    return (
      <div className="flex max-w-lg flex-col gap-8">
        <FlowHeader
          title="Review your withdrawal"
          description={
            mode === 'bank'
              ? 'Confirm the destination account and totals before you authorize.'
              : 'Crypto withdrawals are irreversible. Double-check the address and network.'
          }
        />
        <ReviewCard
          rows={rows}
          confirmLabel={
            mode === 'bank' ? `Withdraw ${formatNgn(amt)}` : `Withdraw ${formatAsset(cAmt, cryptoAsset)}`
          }
          onConfirm={() => setPinOpen(true)}
          onBack={() => setStep('form')}
        />
        <PinDialog
          open={pinOpen}
          description={
            mode === 'bank'
              ? `Enter your 4-digit PIN to withdraw ${formatNgn(amt)} to ${bank} ••${accountNumber.slice(-4)}.`
              : `Enter your 4-digit PIN to withdraw ${formatAsset(cAmt, cryptoAsset)}.`
          }
          onConfirm={async (pin) => {
            const result =
              mode === 'bank'
                ? await withdrawBankAction({ pin, bank, accountNumber, amount: amt, saveBeneficiary: true })
                : await withdrawCryptoAction({ pin, asset: symbol, address: address.trim(), amount: cAmt })
            if (result.ok) {
              setPinOpen(false)
              setStep('done')
              toast(
                'Withdrawal initiated',
                mode === 'bank'
                  ? `${formatNgn(amt)} is on its way to ${bank}.`
                  : `${formatAsset(cAmt, cryptoAsset)} is on its way.`,
              )
            }
            return result
          }}
          onCancel={() => setPinOpen(false)}
        />
      </div>
    )
  }

  return (
    <div className="flex max-w-lg flex-col gap-8">
      <FlowHeader
        title="Withdraw"
        description="Move naira to any Nigerian bank account, or send crypto to an external wallet."
      />

      <form
        className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6"
        onSubmit={(e) => {
          e.preventDefault()
          if (mode === 'bank' ? bankValid : cryptoValid) setStep('review')
        }}
      >
        <div
          className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1"
          role="tablist"
          aria-label="Withdrawal type"
        >
          {(
            [
              ['bank', 'To bank'],
              ['crypto', 'Crypto'],
            ] as [Mode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-md py-2 text-sm font-medium transition-colors ${
                mode === m
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'bank' ? (
          <>
            <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3">
              <span className="text-sm text-muted-foreground">Naira balance</span>
              <span className="font-mono text-sm font-semibold text-foreground">
                {formatNgn(ngnBalance)}
              </span>
            </div>

            {beneficiaries.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-foreground">Saved accounts</p>
                <div className="flex flex-wrap gap-2">
                  {beneficiaries.map((ben) => {
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
                onChange={(e) => {
                  setBank(e.target.value)
                  verifyAccount(e.target.value, accountNumber)
                }}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {NIGERIAN_BANKS.map((b) => (
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
                onChange={(e) => {
                  const next = e.target.value.replace(/\D/g, '')
                  setAccountNumber(next)
                  verifyAccount(bank, next)
                }}
                className="h-10 rounded-lg border border-input bg-background px-3 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              {accountNumber.length > 0 && !validAccount && (
                <p className="text-xs text-muted-foreground">Account number must be 10 digits.</p>
              )}
              {checking && <p className="text-xs text-muted-foreground">Verifying account…</p>}
              {accountName && !checking && (
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
                Minimum {formatNgn(500)} · Fee {formatNgn(fee)} · {tier.name.split(' — ')[0]} limit{' '}
                {formatLimit(tier.singleWithdrawalNgn)} per withdrawal
              </p>
            </div>

            {!withinTierLimit && amt > 0 && (
              <p className="text-xs text-destructive" role="alert">
                Amount exceeds your {formatLimit(tier.singleWithdrawalNgn)} single-withdrawal limit on{' '}
                {tier.name.split(' — ')[0]}. Upgrade your verification tier in Settings to raise it.
              </p>
            )}

            {amt + fee > ngnBalance && amt > 0 && (
              <p className="text-xs text-destructive" role="alert">
                Amount plus the {formatNgn(fee)} fee exceeds your MSN balance.
              </p>
            )}

            <Button type="submit" size="lg" disabled={!bankValid}>
              {bankValid ? `Review — ${formatNgn(amt)}` : 'Continue'}
            </Button>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <label htmlFor="crypto-asset" className="text-sm font-medium text-foreground">
                Asset
              </label>
              <select
                id="crypto-asset"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value as AssetSymbol)}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {cryptoAssets.map((a) => (
                  <option key={a.symbol} value={a.symbol}>
                    {a.name} ({a.symbol})
                  </option>
                ))}
              </select>
              <p className="font-mono text-xs text-muted-foreground">
                You hold {formatAsset(cryptoAsset.balance, cryptoAsset)}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="crypto-address" className="text-sm font-medium text-foreground">
                Destination address
              </label>
              <input
                id="crypto-address"
                type="text"
                autoComplete="off"
                placeholder={`Paste the ${cryptoAsset.symbol} wallet address`}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-10 rounded-lg border border-input bg-background px-3 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              {address.length > 0 && !addressValid && (
                <p className="text-xs text-muted-foreground">
                  That doesn&apos;t look like a valid wallet address yet.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="crypto-amount" className="text-sm font-medium text-foreground">
                Amount ({cryptoAsset.symbol})
              </label>
              <input
                id="crypto-amount"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                placeholder="0.00"
                value={cryptoAmount}
                onChange={(e) => setCryptoAmount(e.target.value)}
                className="h-10 rounded-lg border border-input bg-background px-3 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <p className="text-xs text-muted-foreground">
                ≈ {formatNgn(cNgnValue)} · Daily crypto limit{' '}
                {formatLimit(tier.dailyCryptoWithdrawalNgn)}
              </p>
            </div>

            {cAmt > cryptoAsset.balance && (
              <p className="text-xs text-destructive" role="alert">
                Amount exceeds your {cryptoAsset.symbol} balance.
              </p>
            )}

            {!withinCryptoLimit && cAmt > 0 && (
              <p className="text-xs text-destructive" role="alert">
                This exceeds your {formatLimit(tier.dailyCryptoWithdrawalNgn)} daily crypto
                withdrawal limit. Upgrade your tier in Settings to raise it.
              </p>
            )}

            <Button type="submit" size="lg" disabled={!cryptoValid}>
              {cryptoValid ? `Review — ${formatAsset(cAmt, cryptoAsset)}` : 'Continue'}
            </Button>
          </>
        )}
      </form>
    </div>
  )
}
