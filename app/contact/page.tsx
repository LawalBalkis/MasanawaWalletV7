import type { Metadata } from 'next'
import Link from 'next/link'
import { Activity, ArrowUpRight, LifeBuoy, Mail, MessageSquare } from 'lucide-react'
import { PageShell } from '@/components/site/page-shell'

export const metadata: Metadata = {
  title: 'Contact Masanawa',
  description: 'Reach Masanawa support, media, and careers, or check live system status.',
}

const CHANNELS = [
  { icon: LifeBuoy, title: 'Customer support', body: 'Questions about funding, transfers, conversions, or withdrawals.', action: 'support@masanawa.app', href: 'mailto:support@masanawa.app' },
  { icon: Mail, title: 'Press & media', body: 'Interviews, data requests, and fact-checking.', action: 'press@masanawa.app', href: 'mailto:press@masanawa.app' },
  { icon: MessageSquare, title: 'Careers', body: 'Roles, applications, and general introductions.', action: 'careers@masanawa.app', href: 'mailto:careers@masanawa.app' },
]

export default function ContactPage() {
  return (
    <PageShell
      eyebrow="Contact"
      title="Talk to us."
      description="Pick the channel that fits. For account issues, include your Masanawa @username so we can help faster—never share your password or PIN."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {CHANNELS.map((channel) => (
          <a
            key={channel.title}
            href={channel.href}
            className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <channel.icon className="size-5" />
            </span>
            <h2 className="mt-6 text-base font-semibold text-foreground">{channel.title}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{channel.body}</p>
            <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              {channel.action}
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </a>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-border bg-card p-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Activity className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Checking on a delay?</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">See live operational status before reaching out.</p>
          </div>
        </div>
        <Link
          href="/status"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
        >
          View system status
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </PageShell>
  )
}
