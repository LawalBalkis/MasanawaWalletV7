'use client'

import { Button } from '@/components/ui/button'
import { ShieldCheck, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const PIN_LENGTH = 4

export function PinDialog({
  open,
  title = 'Confirm with your PIN',
  description = 'Enter your 4-digit transaction PIN to authorize this action.',
  onConfirm,
  onCancel,
}: {
  open: boolean
  title?: string
  description?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setPin('')
      setBusy(false)
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
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

  function submit() {
    if (pin.length !== PIN_LENGTH || busy) return
    setBusy(true)
    // Demo: any 4-digit PIN is accepted after a short delay.
    setTimeout(() => onConfirm(), 700)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel()
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <span className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <h2 id="pin-dialog-title" className="mt-4 text-base font-semibold text-foreground">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">{description}</p>

        <form
          className="mt-5 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <div className="relative">
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={PIN_LENGTH}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Transaction PIN"
              disabled={busy}
            />
            <div className="pointer-events-none flex justify-center gap-3" aria-hidden="true">
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <span
                  key={i}
                  className={`flex size-12 items-center justify-center rounded-xl border text-lg font-semibold ${
                    i < pin.length
                      ? 'border-primary bg-accent text-accent-foreground'
                      : 'border-input bg-background text-muted-foreground'
                  }`}
                >
                  {i < pin.length ? '•' : ''}
                </span>
              ))}
            </div>
          </div>

          <Button type="submit" size="lg" disabled={pin.length !== PIN_LENGTH || busy}>
            {busy ? 'Confirming…' : 'Confirm'}
          </Button>
        </form>
      </div>
    </div>
  )
}
