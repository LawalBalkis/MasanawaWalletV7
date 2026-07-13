'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetPasswordAction, type AuthFormState } from '@/lib/auth/actions'
import Link from 'next/link'
import { useActionState } from 'react'

const initialState: AuthFormState = {}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState)

  if (!token) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground text-balance">
          Invalid reset link
        </h1>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">
          This password reset link is missing or malformed. Request a new one to continue.
        </p>
        <Button
          className="mt-6"
          nativeButton={false}
          render={<Link href="/auth/forgot-password" />}
        >
          Request a new link
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground text-balance">
          Choose a new password
        </h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Pick a strong password you don&apos;t use anywhere else.
        </p>
      </header>

      <form className="mt-6 flex flex-col gap-5" action={formAction}>
        <input type="hidden" name="token" value={token} />

        <div className="flex flex-col gap-2">
          <Label htmlFor="reset-password">New password</Label>
          <Input
            id="reset-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            required
            minLength={8}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="reset-confirm">Confirm new password</Label>
          <Input
            id="reset-confirm"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            required
            minLength={8}
          />
        </div>

        {state.error && (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? 'Updating…' : 'Update password'}
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
