'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FlowHeader } from '@/components/wallet/flow-header'
import { cn } from '@/lib/utils'
import { Check, Copy, Landmark, Loader2, ShieldCheck } from 'lucide-react'
import { useActionState, useState } from 'react'
import {
  getOrCreateVirtualAccount,
  type AccountActionResult,
  type VirtualAccountDetails,
} from './actions'

export function FundClient({
  initialAccount,
  initialError,
}: {
  initialAccount: VirtualAccountDetails | null
  initialError?: string
}) {
  const [state, formAction, pending] = useActionState<AccountActionResult | null, FormData>(
    getOrCreateVirtualAccount,
    null,
  )

  const account = state?.account ?? initialAccount

  if (account) {
    return <AccountDetails account={account} />
  }

  return (
    <div className="flex max-w-lg flex-col gap-8">
      <FlowHeader
        title="Set up your funding account"
        description="Get a dedicated PalmPay account number for your wallet. Transfers to it reflect automatically, usually within a minute."
      />

      {initialError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-xs leading-relaxed text-destructive">{initialError}</p>
        </div>
      ) : null}

      <form action={formAction} className="flex flex-col gap-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">Identity verification</p>
              <p className="text-xs text-muted-foreground">
                Required once by CBN regulations to issue your account
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="First name"
                name="firstName"
                autoComplete="given-name"
                placeholder="Adaeze"
                defaultValue={state?.values?.firstName}
                error={state?.fieldErrors?.firstName}
              />
              <Field
                label="Last name"
                name="lastName"
                autoComplete="family-name"
                placeholder="Okafor"
                defaultValue={state?.values?.lastName}
                error={state?.fieldErrors?.lastName}
              />
            </div>
            <Field
              label="Email address"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              defaultValue={state?.values?.email}
              error={state?.fieldErrors?.email}
            />
            <Field
              label="Phone number"
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="numeric"
              placeholder="08012345678"
              defaultValue={state?.values?.phone}
              error={state?.fieldErrors?.phone}
            />

            <IdSection
              defaultIdType={state?.values?.idType === 'bvn' ? 'bvn' : 'nin'}
              idTypeError={state?.fieldErrors?.idType}
              idNumberError={state?.fieldErrors?.idNumber}
            />
          </div>
        </div>

        {state && !state.ok && state.error && !state.fieldErrors ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-xs leading-relaxed text-destructive">{state.error}</p>
          </div>
        ) : null}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Creating your account…
            </>
          ) : (
            'Create my account number'
          )}
        </Button>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Your NIN/BVN is sent securely to our licensed banking partner for
          verification only. It is never stored on Masanawa or shown to anyone.
        </p>
      </form>
    </div>
  )
}

function Field({
  label,
  name,
  error,
  ...props
}: React.ComponentProps<'input'> & { label: string; name: string; error?: string }) {
  const errorId = `${name}-error`
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        required
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function IdSection({
  defaultIdType = 'nin',
  idTypeError,
  idNumberError,
}: {
  defaultIdType?: 'nin' | 'bvn'
  idTypeError?: string
  idNumberError?: string
}) {
  const [idType, setIdType] = useState<'nin' | 'bvn'>(defaultIdType)

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="idNumber">Identity number</Label>
      <input type="hidden" name="idType" value={idType} />
      <div
        role="radiogroup"
        aria-label="Identity type"
        className="grid grid-cols-2 gap-2"
      >
        {(['nin', 'bvn'] as const).map((type) => (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={idType === type}
            onClick={() => setIdType(type)}
            className={cn(
              'h-10 rounded-lg border text-sm font-medium transition-colors',
              idType === type
                ? 'border-primary bg-secondary text-primary'
                : 'border-input bg-background text-muted-foreground hover:text-foreground',
            )}
          >
            {type.toUpperCase()}
          </button>
        ))}
      </div>
      <Input
        id="idNumber"
        name="idNumber"
        inputMode="numeric"
        maxLength={11}
        placeholder={idType === 'nin' ? '11-digit NIN' : '11-digit BVN'}
        aria-invalid={idNumberError ? true : undefined}
        aria-describedby={idNumberError ? 'idNumber-error' : undefined}
        required
        className="mt-1"
      />
      {idTypeError ? <p className="text-xs text-destructive">{idTypeError}</p> : null}
      {idNumberError ? (
        <p id="idNumber-error" className="text-xs text-destructive">
          {idNumberError}
        </p>
      ) : null}
    </div>
  )
}

function AccountDetails({ account }: { account: VirtualAccountDetails }) {
  const [copied, setCopied] = useState(false)

  async function copyAccountNumber() {
    await navigator.clipboard.writeText(account.accountNumber.replace(/\s/g, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex max-w-lg flex-col gap-8">
      <FlowHeader
        title="Fund your wallet"
        description="Transfer naira to your dedicated virtual account. Funds reflect in your wallet automatically, usually within a minute."
      />

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
            <Landmark className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">{account.bankName}</p>
            <p className="text-xs text-muted-foreground">Virtual account</p>
          </div>
        </div>

        <dl className="mt-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-sm text-muted-foreground">Account number</dt>
            <dd className="flex items-center gap-2">
              <span className="font-mono text-base font-semibold tracking-wide text-foreground">
                {account.accountNumber}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={copyAccountNumber}
                aria-label={copied ? 'Copied' : 'Copy account number'}
              >
                {copied ? (
                  <Check className="size-4 text-primary" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-sm text-muted-foreground">Account name</dt>
            <dd className="text-right text-sm font-medium text-foreground">
              {account.accountName}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-border bg-secondary/50 p-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Only send naira from a bank account in your own name. Transfers from
          third-party accounts may be delayed or reversed for your security.
        </p>
      </div>
    </div>
  )
}
