'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signUpAction, type AuthFormState } from '@/lib/auth/actions'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useActionState, useState } from 'react'

const initialState: AuthFormState = {}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  )
}

function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUpAction, initialState)
  const [username, setUsername] = useState('')

  const searchParams = useSearchParams()
  const referralCode = (searchParams.get('ref') ?? '').trim().replace(/^@/, '').toLowerCase()

  const usernameClean = username.trim().replace(/^@/, '').toLowerCase()
  const usernameValid = usernameClean.length === 0 || /^[a-z0-9_]{3,20}$/.test(usernameClean)

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground text-balance">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Get a free NGN account and your own @username in minutes.
        </p>
      </header>

      {referralCode && (
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <p className="text-sm text-foreground">
            You were invited by{' '}
            <span className="font-mono font-medium text-primary">@{referralCode}</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Fund your wallet with ₦2,000 or more and they&apos;ll earn a referral bonus.
          </p>
        </div>
      )}

      <form className="mt-6 flex flex-col gap-5" action={formAction}>
        <input type="hidden" name="ref" value={referralCode} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-name">Full name</Label>
          <Input
            id="signup-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Adaeze Okafor"
            required
            minLength={2}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-username">Username</Label>
          <Input
            id="signup-username"
            name="username"
            type="text"
            autoComplete="off"
            placeholder="@yourname"
            className="font-mono"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            aria-describedby="signup-username-hint"
          />
          <p id="signup-username-hint" className="text-xs text-muted-foreground">
            {!usernameValid
              ? '3–20 characters: letters, numbers and underscores only.'
              : 'Friends send you money with this. You can’t change it later.'}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-email">Email address</Label>
          <Input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
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
          {pending ? 'Creating account…' : 'Create account'}
        </Button>

        <p className="text-center text-xs text-muted-foreground text-pretty">
          By continuing you agree to Masanawa&apos;s Terms of Service and Privacy Policy.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/auth/sign-in" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
