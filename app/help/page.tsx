import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight, Banknote, CircleDollarSign, LifeBuoy, RefreshCcw, Send, ShieldCheck } from 'lucide-react'
import { PageShell } from '@/components/site/page-shell'

export const metadata: Metadata = {
  title: 'Help Center | Masanawa',
  description: 'Find answers about funding, buying, sending, converting, and withdrawing on Masanawa.',
}

const TOPICS = [
  { icon: Banknote, title: 'Funding your account', body: 'Add naira to your dedicated virtual account and confirm deposits.' },
  { icon: CircleDollarSign, title: 'Buying & selling', body: 'Move between naira and supported tokens with the rate shown first.' },
  { icon: Send, title: 'Username transfers', body: 'Send assets to any Masanawa @username without an address.' },
  { icon: RefreshCcw, title: 'Converting to naira', body: 'Turn received crypto into NGN before withdrawing.' },
  { icon: Banknote, title: 'Withdrawals', body: 'Send your available NGN balance to a supported Nigerian bank.' },
  { icon: ShieldCheck, title: 'Account & security', body: 'Manage sign-in, verification, and transaction confirmation.' },
]

export default function HelpPage() {
  return (
    <PageShell
      eyebrow="Help center"
      title="How can we help?"
      description="Browse common topics, read the FAQ, or reach our support team directly."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOPICS.map((topic) => (
          <Link
            key={topic.title}
            href="/#faq"
            className="group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <topic.icon className="size-5" />
            </span>
            <h2 className="mt-6 flex items-center gap-1.5 text-base font-semibold text-foreground">
              {topic.title}
              <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{topic.body}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-border bg-card p-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <LifeBuoy className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Still need help?</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Our support team is one message away.</p>
          </div>
        </div>
        <Link
          href="/contact"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Contact support
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </PageShell>
  )
}
