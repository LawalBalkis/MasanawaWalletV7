'use client'

import { AdminHeader } from '@/components/admin/primitives'
import { updatePlatformConfigAction } from '@/lib/wallet/admin-actions'
import { useActionState, useState } from 'react'

export interface PlatformConfig {
  sendFeeNgn: number
  tradeFeeRate: number
  tradeFeeMinNgn: number
  withdrawFeeNgn: number
  minTradeNgn: number
  minWithdrawNgn: number
  referralBonusNgn: number
  referralQualifyNgn: number
  referralWithdrawMinNgn: number
}

const CONFIG_LABELS: Record<keyof PlatformConfig, string> = {
  sendFeeNgn: 'Send fee (NGN)',
  tradeFeeRate: 'Trade fee rate (fraction)',
  tradeFeeMinNgn: 'Trade fee minimum (NGN)',
  withdrawFeeNgn: 'Withdrawal fee (NGN)',
  minTradeNgn: 'Minimum trade (NGN)',
  minWithdrawNgn: 'Minimum withdrawal (NGN)',
  referralBonusNgn: 'Referral bonus (NGN)',
  referralQualifyNgn: 'Referral qualification threshold (NGN)',
  referralWithdrawMinNgn: 'Referral withdrawal minimum (NGN)',
}

const DEFAULTS: PlatformConfig = {
  sendFeeNgn: 0,
  tradeFeeRate: 0.01,
  tradeFeeMinNgn: 100,
  withdrawFeeNgn: 50,
  minTradeNgn: 1000,
  minWithdrawNgn: 500,
  referralBonusNgn: 200,
  referralQualifyNgn: 2000,
  referralWithdrawMinNgn: 2000,
}

const NUMERIC_KEYS = Object.keys(CONFIG_LABELS) as (keyof PlatformConfig)[]

export function ConfigClient({ config }: { config: PlatformConfig }) {
  const [values, setValues] = useState<PlatformConfig>(config)
  const [state, formAction, pending] = useActionState(
    async (_prev: { ok: boolean; error?: string }, formData: FormData) => {
      const config: Record<string, number> = {}
      for (const key of NUMERIC_KEYS) {
        const val = formData.get(key)
        if (val != null && val !== '') config[key] = parseFloat(String(val))
      }
      return updatePlatformConfigAction(config)
    },
    { ok: true },
  )

  function handleChange(key: keyof PlatformConfig, value: string) {
    const num = parseFloat(value)
    setValues((prev) => ({ ...prev, [key]: isNaN(num) ? 0 : num }))
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminHeader
        title="Platform configuration"
        description="Tune fees, limits, and referral parameters without a deploy. Changes take effect immediately (30s cache)."
      />

      {state.ok === false && state.error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}
      {state.ok === true && (state as any).error === undefined && pending === false && (
        <div className="rounded-lg border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
          Configuration saved.
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {NUMERIC_KEYS.map((key) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label htmlFor={`cfg-${key}`} className="text-sm font-medium text-foreground">
                {CONFIG_LABELS[key]}
              </label>
              <input
                id={`cfg-${key}`}
                name={key}
                type="number"
                step="any"
                value={values[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Default: {DEFAULTS[key]}
              </p>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save configuration'}
        </button>
      </form>
    </div>
  )
}
