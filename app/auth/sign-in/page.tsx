'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signInAction, type AuthFormState } from '@/lib/auth/actions'
import Link from 'next/link'
import { useActionState } from 'react'

const initialState: AuthFormState = {}

export default function SignInPage() {
  const [state, formAction, pending] = useActionState(signInAction, initialState)

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground text-balance">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to your Masanawa wallet.
        </p>
      </header>

      <form className="mt-6 flex flex-col gap-5" action={formAction}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="signin-email">Email address</Label>
          <Input
            id="signin-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="signin-password">Password</Label>
            <Link
              href="/auth/forgot-password"
              className="text-xs font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="signin-password"
            name="password"
            type="password"
            autoComplete="current-password"
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
          {pending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Masanawa?{' '}
        <Link href="/auth/sign-up" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>

      <p className="mt-4 rounded-lg bg-secondary px-3 py-2 text-center text-xs text-muted-foreground">
        {'Demo account: demo@masanawa.app · password123 · PIN 1234'}
      </p>
    </div>
  )
}
