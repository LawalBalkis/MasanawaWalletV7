'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function PinSetupPage() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [busy, setBusy] = useState(false)

  const pinValid = /^\d{4}$/.test(pin)
  const mismatch = confirmPin.length === 4 && pin !== confirmPin
  const valid = pinValid && pin === confirmPin

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    // Demo PIN setup: replaced with real secure storage in the wiring step.
    setTimeout(() => router.push('/dashboard'), 700)
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground text-balance">
          Set your transaction PIN
        </h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          You&apos;ll use this 4-digit PIN to approve every transfer, trade and withdrawal.
        </p>
      </header>

      <form className="mt-6 flex flex-col gap-5" onSubmit={submit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pin-new">Choose a 4-digit PIN</Label>
          <Input
            id="pin-new"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={4}
            placeholder="••••"
            className="text-center font-mono text-lg tracking-[0.5em]"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="pin-confirm">Confirm PIN</Label>
          <Input
            id="pin-confirm"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={4}
            placeholder="••••"
            className="text-center font-mono text-lg tracking-[0.5em]"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            required
            aria-invalid={mismatch || undefined}
          />
          {mismatch && (
            <p className="text-xs text-destructive" role="alert">
              PINs don&apos;t match. Try again.
            </p>
          )}
        </div>

        <Button type="submit" size="lg" disabled={!valid || busy}>
          {busy ? 'Saving…' : 'Save PIN and continue'}
        </Button>
      </form>
    </div>
  )
}
