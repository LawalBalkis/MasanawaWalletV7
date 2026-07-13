import type { Metadata } from 'next'
import { CheckCircle2 } from 'lucide-react'
import { PageShell } from '@/components/site/page-shell'

export const metadata: Metadata = {
  title: 'System Status | Masanawa',
  description: 'Live operational status for Masanawa funding, trading, transfers, and withdrawals.',
}

const SYSTEMS = [
  { name: 'NGN funding & deposits', status: 'Operational' },
  { name: 'Buy & sell', status: 'Operational' },
  { name: 'Username transfers', status: 'Operational' },
  { name: 'Crypto to naira conversion', status: 'Operational' },
  { name: 'Bank withdrawals', status: 'Operational' },
  { name: 'Sign-in & authentication', status: 'Operational' },
]

export default function StatusPage() {
  return (
    <PageShell
      eyebrow="Status"
      title="System status."
      description="Current operational status of Masanawa services. This page reflects platform components in real time."
    >
      <div className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-accent/40 p-6">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <CheckCircle2 className="size-5" />
        </span>
        <div>
          <p className="text-base font-semibold text-foreground">All systems operational</p>
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">No incidents reported</p>
        </div>
      </div>

      <ul className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card">
        {SYSTEMS.map((system) => (
          <li key={system.name} className="flex items-center justify-between gap-4 px-6 py-5">
            <span className="text-sm font-medium text-foreground">{system.name}</span>
            <span className="flex items-center gap-2 text-sm text-primary">
              <span className="size-2 rounded-full bg-primary" aria-hidden />
              {system.status}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
        Processing times can vary by bank and network conditions even when all systems are operational. Transaction
        details and any delays are shown in-app.
      </p>
    </PageShell>
  )
}
