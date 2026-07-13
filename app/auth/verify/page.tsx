'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  resendOtpAction,
  verifyEmailAction,
  type AuthFormState,
} from '@/lib/auth/actions'
import { useActionState, useState } from 'react'

const initialState: AuthFormState = {}

export default function VerifyPage() {
  const [code, setCode] = useState('')
  const [state, formAction, pending] = useActionState(verifyEmailAction, initialState)
  const [resendState, resendAction, resending] = useActionState(
    async () => resendOtpAction(),
    initialState,
  )

  const valid = /^\d{6}$/.test(code)

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

      <form className="mt-6 flex flex-col gap-5" action={formAction}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="verify-code">Verification code</Label>
          <Input
            id="verify-code"
            name="code"
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

        {state.error && (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={!valid || pending}>
          {pending ? 'Verifying…' : 'Verify email'}
        </Button>
      </form>

      <form action={resendAction} className="mt-6 text-center text-sm text-muted-foreground">
        {resendState.success ? (
          <p role="status">{resendState.success}</p>
        ) : resendState.error ? (
          <p role="alert" className="text-destructive">
            {resendState.error}
          </p>
        ) : (
          <button
            type="submit"
            disabled={resending}
            className="font-medium text-primary hover:underline disabled:opacity-60"
          >
            {resending ? 'Sending…' : "Didn't get the code? Resend it"}
          </button>
        )}
      </form>
    </div>
  )
}
