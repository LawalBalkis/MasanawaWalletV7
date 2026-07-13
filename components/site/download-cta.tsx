import { ArrowRight, BadgeCheck } from 'lucide-react'
import Link from 'next/link'

const CTA_POINTS = ['Personal virtual NGN account', 'Send with a @username', 'Withdraw to a Nigerian bank']

export function DownloadCta() {
  return (
    <section id="get-started" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 lg:py-28">
      <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-card px-6 py-16 text-center sm:px-12 lg:py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary/60"
        />
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Live in Nigeria</span>
        <h2 className="relative mx-auto mt-5 max-w-2xl text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Open your Masanawa account and start moving money today.
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
          Fund with naira, buy and sell crypto, send to any @username, and withdraw to your bank —
          rates and fees shown before every confirmation.
        </p>
        <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2"
          >
            Get started
            <ArrowRight className="size-4" />
          </Link>
          <a
            href="#faq"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-7 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:outline-2"
          >
            Read the FAQ
          </a>
        </div>
        <ul className="relative mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {CTA_POINTS.map((point) => (
            <li key={point} className="flex items-center gap-2 text-sm text-muted-foreground">
              <BadgeCheck className="size-4 shrink-0 text-primary" />
              {point}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
