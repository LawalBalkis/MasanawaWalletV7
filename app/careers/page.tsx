import type { Metadata } from 'next'
import { ArrowUpRight } from 'lucide-react'
import { PageShell } from '@/components/site/page-shell'

export const metadata: Metadata = {
  title: 'Careers at Masanawa',
  description: 'Help build clear, safe money movement for Nigeria. See open roles at Masanawa.',
}

const ROLES = [
  { title: 'Senior Backend Engineer', team: 'Engineering', location: 'Lagos / Remote', type: 'Full-time' },
  { title: 'Product Designer', team: 'Design', location: 'Remote (WAT ±3)', type: 'Full-time' },
  { title: 'Compliance Analyst', team: 'Risk & Compliance', location: 'Lagos', type: 'Full-time' },
  { title: 'Customer Operations Lead', team: 'Support', location: 'Lagos / Remote', type: 'Full-time' },
]

export default function CareersPage() {
  return (
    <PageShell
      eyebrow="Careers"
      title="Build the way Nigeria moves money."
      description="We are a small team focused on clarity, safety, and speed. If you care about the details that make money movement trustworthy, we would like to meet you."
    >
      <div className="flex items-center justify-between border-b border-border pb-5">
        <h2 className="text-lg font-semibold text-foreground">Open roles</h2>
        <span className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">{ROLES.length} positions</span>
      </div>

      <ul className="mt-2 divide-y divide-border">
        {ROLES.map((role) => (
          <li key={role.title}>
            <a
              href="mailto:careers@masanawa.app?subject=Application"
              className="group flex flex-col gap-3 py-6 transition-colors hover:bg-card/60 sm:flex-row sm:items-center sm:justify-between sm:px-2"
            >
              <div>
                <p className="text-base font-medium text-foreground">{role.title}</p>
                <p className="mt-1 font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">{role.team}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">{role.location}</span>
                <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">{role.type}</span>
                <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-12 rounded-2xl border border-border bg-card p-8">
        <h2 className="text-lg font-semibold text-foreground">Do not see your role?</h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          We are always glad to meet thoughtful people. Send us a note about what you do and how you would like to help.
        </p>
        <a
          href="mailto:careers@masanawa.app"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          careers@masanawa.app
          <ArrowUpRight className="size-4" />
        </a>
      </div>
    </PageShell>
  )
}
