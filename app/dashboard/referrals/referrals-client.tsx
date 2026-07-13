'use client'

import { Button } from '@/components/ui/button'
import { FlowHeader } from '@/components/wallet/flow-header'
import { useToast } from '@/components/wallet/toast'
import { formatNgn } from '@/lib/wallet/assets'
import type { ReferralStats } from '@/lib/wallet/store'
import { Check, CheckCircle2, Clock, Copy, Gift, Share2, Users, Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { withdrawReferralAction } from './actions'

export function ReferralsClient({
  code,
  link,
  stats,
  bonusNgn,
  qualifyNgn,
  withdrawMinNgn,
}: {
  code: string
  link: string
  stats: ReferralStats
  bonusNgn: number
  qualifyNgn: number
  withdrawMinNgn: number
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()

  const canWithdraw = stats.availableNgn >= withdrawMinNgn
  const remainingToWithdraw = Math.max(0, withdrawMinNgn - stats.availableNgn)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      toast('Link copied', 'Share it with friends to start earning.')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('Could not copy', 'Copy the link manually instead.', 'info')
    }
  }

  async function share() {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: 'Join me on Masanawa',
          text: 'Get a free naira account and trade crypto on Masanawa.',
          url: link,
        })
        return
      } catch {
        // User dismissed the share sheet — fall through to copy.
      }
    }
    copyLink()
  }

  function withdraw() {
    startTransition(async () => {
      const result = await withdrawReferralAction()
      if (result.ok) {
        toast('Earnings withdrawn', `${formatNgn(result.amount ?? 0)} added to your NGN wallet.`)
        router.refresh()
      } else {
        toast('Withdrawal failed', result.error, 'info')
      }
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <FlowHeader
        title="Refer & Earn"
        description={`Invite friends and earn ${formatNgn(bonusNgn)} for each one who funds their wallet with ${formatNgn(qualifyNgn)} or more.`}
      />

      {/* Referral balance + withdraw */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Referral balance</p>
            <p className="mt-1 font-mono text-3xl font-semibold tracking-tight text-foreground">
              {formatNgn(stats.availableNgn)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {canWithdraw
                ? 'Ready to move into your NGN wallet.'
                : `Earn ${formatNgn(remainingToWithdraw)} more to unlock withdrawals (minimum ${formatNgn(withdrawMinNgn)}).`}
            </p>
          </div>
          <Button size="lg" onClick={withdraw} disabled={!canWithdraw || pending}>
            <Wallet className="size-4" aria-hidden="true" />
            {pending ? 'Withdrawing…' : 'Withdraw to wallet'}
          </Button>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Total invites" value={String(stats.total)} />
        <StatCard icon={CheckCircle2} label="Qualified" value={String(stats.qualified)} />
        <StatCard icon={Clock} label="Pending" value={String(stats.pending)} />
        <StatCard icon={Gift} label="Total earned" value={formatNgn(stats.earnedNgn)} />
      </section>

      {/* Share link */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-sm font-medium text-foreground">Your referral link</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Friends who sign up with your code{' '}
          <span className="font-mono text-primary">@{code}</span> are linked to you automatically.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <div className="flex min-w-0 flex-1 items-center rounded-lg border border-input bg-background px-3">
            <span className="truncate font-mono text-sm text-foreground">{link}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={copyLink} className="flex-1 sm:flex-none">
              {copied ? (
                <Check className="size-4 text-primary" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button onClick={share} className="flex-1 sm:flex-none">
              <Share2 className="size-4" aria-hidden="true" />
              Share
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="rounded-2xl border border-border bg-secondary/40 p-6">
        <h2 className="text-sm font-medium text-foreground">How it works</h2>
        <ol className="mt-4 flex flex-col gap-4">
          {[
            { n: 1, t: 'Share your link', d: 'Send your referral link to friends and family.' },
            {
              n: 2,
              t: 'They fund their wallet',
              d: `Your referral qualifies once they fund ${formatNgn(qualifyNgn)} in total.`,
            },
            {
              n: 3,
              t: 'You earn instantly',
              d: `${formatNgn(bonusNgn)} lands in your referral balance the moment they qualify.`,
            },
            {
              n: 4,
              t: 'Withdraw to your wallet',
              d: `Cash out to your NGN wallet once you reach ${formatNgn(withdrawMinNgn)}.`,
            },
          ].map((step) => (
            <li key={step.n} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs font-semibold text-primary-foreground">
                {step.n}
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">{step.t}</p>
                <p className="text-xs text-muted-foreground">{step.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Invited friends */}
      <section>
        <h2 className="text-sm font-medium text-foreground">Invited friends</h2>
        {stats.referrals.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center">
            <Users className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-foreground">No referrals yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Share your link above to start earning.
            </p>
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {stats.referrals.map((r) => (
              <li
                key={r.referredUserId}
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{r.referredName}</p>
                  <p className="font-mono text-xs text-muted-foreground">@{r.referredUsername}</p>
                </div>
                {r.qualified ? (
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <CheckCircle2 className="size-3.5" aria-hidden="true" />
                    Earned {formatNgn(r.bonusNgn)}
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                    <Clock className="size-3.5" aria-hidden="true" />
                    Pending
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Icon className="size-4 text-muted-foreground" aria-hidden={true} />
      <p className="mt-3 font-mono text-lg font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
