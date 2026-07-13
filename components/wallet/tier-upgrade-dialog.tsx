'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { KYC_ID_TYPES } from '@/lib/wallet/account-actions'
import { ShieldCheck, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export interface TierUpgradeSubmit {
  targetTier: number
  address?: string
  idType?: string
  idNumber?: string
}

/**
 * Collects the KYC data required to move up one verification tier and submits
 * it. `onSubmit` performs the server action; return `{ ok: false, error }` to
 * keep the dialog open and surface the error.
 */
export function TierUpgradeDialog({
  open,
  targetTier,
  tierName,
  onSubmit,
  onCancel,
}: {
  open: boolean
  targetTier: 2 | 3
  tierName: string
  onSubmit: (data: TierUpgradeSubmit) => Promise<{ ok: boolean; error?: string }>
  onCancel: () => void
}) {
  const [address, setAddress] = useState('')
  const [idType, setIdType] = useState<string>('')
  const [idNumber, setIdNumber] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setAddress('')
      setIdType('')
      setIdNumber('')
      setBusy(false)
      setError(null)
    }
  }, [open])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open && !busy) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onCancel])

  if (!open) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const result = await onSubmit(
        targetTier === 2
          ? { targetTier, address }
          : { targetTier, idType, idNumber },
      )
      if (!result.ok) {
        setError(result.error ?? 'Something went wrong. Try again.')
        setBusy(false)
      }
    } catch {
      setError('Something went wrong. Try again.')
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tier-upgrade-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="tier-upgrade-title" className="text-base font-semibold text-foreground">
                Upgrade to {tierName}
              </h2>
              <p className="text-xs text-muted-foreground">
                {targetTier === 2
                  ? 'Verify your residential address to raise your limits.'
                  : 'Add a government ID to unlock unlimited limits.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary"
            aria-label="Close"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <form className="mt-6 flex flex-col gap-4" onSubmit={submit}>
          {targetTier === 2 ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="kyc-address" className="text-sm font-medium text-foreground">
                Residential address
              </label>
              <Input
                id="kyc-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="12 Awolowo Road, Ikoyi, Lagos"
                autoComplete="street-address"
              />
              <p className="text-xs text-muted-foreground">
                Enter the full address on your utility bill or bank statement.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <label htmlFor="kyc-id-type" className="text-sm font-medium text-foreground">
                  Government ID type
                </label>
                <Select
                  id="kyc-id-type"
                  value={idType}
                  onChange={(e) => setIdType(e.target.value)}
                >
                  <option value="" disabled>
                    Select an ID
                  </option>
                  {KYC_ID_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="kyc-id-number" className="text-sm font-medium text-foreground">
                  ID number
                </label>
                <Input
                  id="kyc-id-number"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="Enter the number on your ID"
                  className="font-mono"
                />
              </div>
            </>
          )}

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="mt-2 flex gap-3">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={busy} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="flex-1">
              {busy ? 'Submitting…' : 'Submit & upgrade'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
