'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const usernameClean = username.trim().replace(/^@/, '').toLowerCase()
  const usernameValid = /^[a-z0-9_]{3,20}$/.test(usernameClean)
  const valid =
    name.trim().length >= 2 &&
    usernameValid &&
    /\S+@\S+\.\S+/.test(email) &&
    password.length >= 8

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    // Demo signup: replaced with real account creation in the wiring step.
    setTimeout(() => router.push('/auth/verify'), 700)
  }

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

      <form className="mt-6 flex flex-col gap-5" onSubmit={submit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-name">Full name</Label>
          <Input
            id="signup-name"
            type="text"
            autoComplete="name"
            placeholder="Adaeze Okafor"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-username">Username</Label>
          <Input
            id="signup-username"
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
            {username.length > 0 && !usernameValid
              ? '3–20 characters: letters, numbers and underscores only.'
              : 'Friends send you money with this. You can’t change it later.'}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-email">Email address</Label>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        <Button type="submit" size="lg" disabled={!valid || busy}>
          {busy ? 'Creating account…' : 'Create account'}
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
