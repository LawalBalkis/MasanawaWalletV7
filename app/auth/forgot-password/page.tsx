'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MailCheck } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const valid = /\S+@\S+\.\S+/.test(email)

  if (sent) {
    return (
      <div
        className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center"
        role="status"
      >
        <MailCheck className="size-10 text-primary" aria-hidden="true" />
        <div>
          <p className="text-base font-semibold text-foreground">Check your inbox</p>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            If an account exists for {email}, we&apos;ve sent a link to reset your password.
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

      <form
        className="mt-6 flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) setSent(true)
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="forgot-email">Email address</Label>
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <Button type="submit" size="lg" disabled={!valid}>
          Send reset link
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
