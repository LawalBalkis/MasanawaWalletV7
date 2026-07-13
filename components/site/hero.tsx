import { ArrowDownToLine, ArrowRight, BadgeCheck, ChevronRight, Plus, Send } from 'lucide-react'
import Link from 'next/link'
import { HERO_STATS, TRUST_POINTS, VERIFIED_LABEL } from './data'

export function Hero() {
  const VerifiedIcon = VERIFIED_LABEL.icon
  return (
    <section id="top" className="relative overflow-hidden border-b border-border">
      {/* spec strip */}
      <div className="border-b border-border bg-secondary/40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:px-8 lg:px-12">
          <span>Masanawa / Retail Wallet</span>
          <span className="hidden sm:block">NGN &rarr; Crypto &rarr; NGN</span>
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-primary" />
            Live
          </span>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10 lg:px-12 lg:py-14 xl:py-16">
        <div className="flex flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground">
            <VerifiedIcon className="size-4" />
            {VERIFIED_LABEL.text}
          </div>
          <h1 className="mt-6 max-w-3xl text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.045em] text-foreground sm:text-5xl lg:text-6xl xl:text-7xl">
            Naira in. Crypto out. Money moves your way.
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Fund with your personal NGN account, buy or sell crypto, send to any Masanawa username, and
            withdraw naira to your bank.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2"
            >
              Open Masanawa <ArrowRight className="size-4" />
            </Link>
            <a
              href="#flow"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:outline-2"
            >
              See how it works <ChevronRight className="size-4" />
            </a>
          </div>
          <ul className="mt-9 flex flex-wrap gap-x-5 gap-y-2.5 border-t border-border pt-6">
            {TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-2 text-sm text-muted-foreground">
                <BadgeCheck className="size-4 shrink-0 text-primary" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center justify-center lg:justify-end">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-primary/10 blur-2xl"
          />
          <div className="relative w-full max-w-md rounded-[2rem] border border-border bg-background p-3 shadow-2xl shadow-background/60">
            <div className="rounded-[1.4rem] border border-border bg-card p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Total balance
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">₦2,480,500.00</p>
                  <p className="mt-1 text-sm text-primary">NGN + crypto assets</p>
                </div>
                <span className="rounded-full border border-primary/30 bg-accent px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-accent-foreground">
                  Live
                </span>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-2">
                {[
                  { icon: Plus, label: 'Fund' },
                  { icon: Send, label: 'Send' },
                  { icon: ArrowDownToLine, label: 'Withdraw' },
                ].map((action) => (
                  <div
                    key={action.label}
                    className="flex flex-col items-center gap-2 rounded-xl bg-secondary p-3 text-xs font-medium text-secondary-foreground"
                  >
                    <action.icon className="size-4 text-primary" />
                    {action.label}
                  </div>
                ))}
              </div>
              <div id="account" className="mt-6 scroll-mt-24 rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Your virtual NGN account</p>
                    <p className="mt-1 font-mono text-base font-semibold tracking-wider text-foreground">
                      1024 568 920
                    </p>
                  </div>
                  <span className="rounded-lg bg-accent px-2.5 py-1.5 text-xs font-semibold text-accent-foreground">
                    Copy
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                  <span>Masanawa / Ada Okafor</span>
                  <span>NGN</span>
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-primary p-4 text-primary-foreground">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs opacity-70">Send USDT to</p>
                    <p className="mt-1 font-semibold">@chidi.ng</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs opacity-70">Recipient gets</p>
                    <p className="mt-1 font-semibold">₦160,250</p>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Recent activity</p>
                  <p className="mt-1 text-sm font-medium text-foreground">Bank funding confirmed</p>
                </div>
                <p className="text-sm font-semibold text-primary">+₦250,000</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* stat strip */}
      <div className="border-t border-border bg-secondary/40">
        <dl className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-border border-x border-border lg:grid-cols-4 lg:divide-y-0">
          {HERO_STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1 px-4 py-5 sm:px-8 lg:px-6">
              <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {stat.label}
              </dt>
              <dd className="text-lg font-semibold tracking-tight text-foreground">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
