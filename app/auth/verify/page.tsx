'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function VerifyPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [resent, setResent] = useState(false)

  const valid = /^\d{6}$/.test(code)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    // Demo verification: replaced with a real OTP check in the wiring step.
    setTimeout(() => router.push('/auth/pin'), 700)
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground text-balance">
          Verify your email
        </h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          We sent a 6-digit code to your email address. Enter it below to continue.
        </p>
      </header>

      <form className="mt-6 flex flex-col gap-5" onSubmit={submit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="verify-code">Verification code</Label>
          <Input
            id="verify-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            className="text-center font-mono text-lg tracking-[0.5em]"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
          />
        </div>

        <Button type="submit" size="lg" disabled={!valid || busy}>
          {busy ? 'Verifying…' : 'Verify email'}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        {resent ? (
          <p role="status">A new code is on its way.</p>
        ) : (
          <button
            type="button"
            onClick={() => setResent(true)}
            className="font-medium text-primary hover:underline"
          >
            Didn&apos;t get the code? Resend it
          </button>
        )}
      </div>
    </div>
  )
}
