'use client'

import { Button } from '@/components/ui/button'
import { FlowHeader } from '@/components/wallet/flow-header'
import { DEMO_USER } from '@/lib/wallet/demo-data'
import { Check, Copy, Landmark } from 'lucide-react'
import { useState } from 'react'

export default function FundPage() {
  const [copied, setCopied] = useState(false)
  const { bank, accountNumber, accountName } = DEMO_USER.virtualAccount

  async function copyAccountNumber() {
    await navigator.clipboard.writeText(accountNumber.replace(/\s/g, ''))
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
            <p className="text-sm font-medium text-foreground">{bank}</p>
            <p className="text-xs text-muted-foreground">Virtual account</p>
          </div>
        </div>

        <dl className="mt-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-sm text-muted-foreground">Account number</dt>
            <dd className="flex items-center gap-2">
              <span className="font-mono text-base font-semibold tracking-wide text-foreground">
                {accountNumber}
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
            <dd className="text-right text-sm font-medium text-foreground">{accountName}</dd>
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
