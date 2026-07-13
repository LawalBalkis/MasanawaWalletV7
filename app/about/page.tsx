import type { Metadata } from 'next'
import { Banknote, Eye, ShieldCheck, Users } from 'lucide-react'
import { PageShell } from '@/components/site/page-shell'

export const metadata: Metadata = {
  title: 'About Masanawa',
  description: 'Masanawa helps people in Nigeria move between naira and crypto with clarity and control.',
}

const VALUES = [
  { icon: Eye, title: 'Clarity before every move', body: 'Rates, fees, and recipients are shown before you confirm. No surprises after money leaves your balance.' },
  { icon: ShieldCheck, title: 'Safety by default', body: 'Verified accounts, protected sign-in, and clear activity records keep your money connected to you.' },
  { icon: Banknote, title: 'Naira-first', body: 'Fund with a normal bank transfer and withdraw to a Nigerian bank. Crypto fits around how you already move money.' },
  { icon: Users, title: 'Built for everyday people', body: 'Send by @username instead of copying long addresses. Money movement should feel as simple as a message.' },
]

const FACTS = [
  { value: 'NGN + 5', label: 'Supported assets' },
  { value: '@username', label: 'Send without addresses' },
  { value: 'Instant', label: 'In-app settlement' },
  { value: 'NG banks', label: 'Direct withdrawals' },
]

export default function AboutPage() {
  return (
    <PageShell
      eyebrow="About"
      title="Money movement in Nigeria, made clear."
      description="Masanawa is a naira-first wallet for buying, selling, and sending crypto. We built it so the important details are always visible—before you confirm, not after."
    >
      <div className="grid grid-cols-2 gap-4 border-b border-border pb-14 sm:grid-cols-4">
        {FACTS.map((fact) => (
          <div key={fact.label}>
            <p className="text-3xl font-semibold tracking-tight text-foreground">{fact.value}</p>
            <p className="mt-2 font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">{fact.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-14">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">What we value</span>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {VALUES.map((value) => (
            <article key={value.title} className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <value.icon className="size-5" />
              </span>
              <h2 className="mt-6 text-lg font-semibold text-foreground">{value.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{value.body}</p>
            </article>
          ))}
        </div>
      </div>
    </PageShell>
  )
}
