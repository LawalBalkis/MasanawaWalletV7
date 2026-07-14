import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight, Banknote, CircleDollarSign, LifeBuoy, RefreshCcw, Send, ShieldCheck, Sparkles, Handshake } from 'lucide-react'
import { PageShell } from '@/components/site/page-shell'

export const metadata: Metadata = {
  title: 'Help Center | Masanawa',
  description: 'Find answers about MSN, funding, trading, P2P escrow, sending, and withdrawing on Masanawa.',
}

const TOPICS = [
  { icon: Sparkles, title: 'What is MSN?', body: 'MSN (Masanawa Token) is your in-wallet balance. 1 MSN = ₦1, always. Fund with naira, spend as MSN, withdraw back to naira.' },
  { icon: Handshake, title: 'P2P trading & escrow', body: 'Trade crypto with other users safely. The platform locks the seller\u2019s crypto in escrow until you pay — no trust required.' },
  { icon: Banknote, title: 'Funding your account', body: 'Add naira to your dedicated virtual account. Each deposit purchases MSN at 1:1, instantly.' },
  { icon: CircleDollarSign, title: 'Buying & selling', body: 'Move between MSN and supported tokens with the rate shown before you confirm.' },
  { icon: Send, title: 'Username transfers', body: 'Send MSN or crypto to any Masanawa @username without an address.' },
  { icon: RefreshCcw, title: 'Withdrawing to naira', body: 'Redeem your MSN for naira and withdraw to a supported Nigerian bank account.' },
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
            href="#"
            className="group flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
          >
            <topic.icon className="size-5 text-primary" aria-hidden="true" />
            <h3 className="text-base font-semibold text-foreground">{topic.title}</h3>
            <p className="text-sm text-muted-foreground">{topic.body}</p>
            <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
              Learn more
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center">
        <LifeBuoy className="size-8 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-foreground">Still need help?</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Our support team is available around the clock. Reach us at{' '}
          <a href="mailto:support@masanawa.app" className="font-medium text-primary hover:underline">
            support@masanawa.app
          </a>{' '}
          or tap the chat bubble in the app.
        </p>
      </div>
    </PageShell>
  )
}
