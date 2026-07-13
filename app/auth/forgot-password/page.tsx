'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestPasswordResetAction, type AuthFormState } from '@/lib/auth/actions'
import { MailCheck } from 'lucide-react'
import Link from 'next/link'
import { useActionState } from 'react'

const initialState: AuthFormState = {}

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    initialState,
  )

  if (state.success) {
    return (
      <div
        className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center"
        role="status"
      >
        <MailCheck className="size-10 text-primary" aria-hidden="true" />
        <div>
          <p className="text-base font-semibold text-foreground">Check your inbox</p>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            If an account exists for that email, we&apos;ve sent a link to reset your password.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/auth/sign-in" />}>
          Back to sign in
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground text-balance">
          Reset your password
        </h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Enter the email on your account and we&apos;ll send you a reset link.
        </p>
      </header>

      <form className="mt-6 flex flex-col gap-5" action={formAction}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="forgot-email">Email address</Label>
          <Input
            id="forgot-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </div>

        {state.error && (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{' '}
        <Link href="/auth/sign-in" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
