import type { Metadata } from 'next'
import { ArrowUpRight, Download } from 'lucide-react'
import { PageShell } from '@/components/site/page-shell'
import { LogoMark } from '@/components/site/logo'

export const metadata: Metadata = {
  title: 'Press & Media | Masanawa',
  description: 'Brand assets, fast facts, and media contact for Masanawa.',
}

const FACTS = [
  { label: 'Company', value: 'Masanawa' },
  { label: 'Category', value: 'Consumer fintech / crypto wallet' },
  { label: 'Market', value: 'Nigeria' },
  { label: 'Product', value: 'Naira funding, buy/sell, @username transfers, bank withdrawals' },
]

export default function PressPage() {
  return (
    <PageShell
      eyebrow="Press"
      title="Press & media resources."
      description="Everything you need to write about Masanawa accurately, including brand assets and a media contact."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-8">
          <h2 className="text-lg font-semibold text-foreground">Brand assets</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Use the Masanawa logomark on solid backgrounds with clear space around it. Do not stretch, recolor, or add effects.
          </p>
          <div className="mt-6 flex items-center gap-4 rounded-xl border border-border bg-background p-6">
            <LogoMark className="size-14" />
            <div>
              <p className="text-sm font-medium text-foreground">Primary logomark</p>
              <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">SVG · green on dark</p>
            </div>
          </div>
          <a
            href="/icon.svg"
            download
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
          >
            <Download className="size-4" />
            Download logomark (SVG)
          </a>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8">
          <h2 className="text-lg font-semibold text-foreground">Fast facts</h2>
          <dl className="mt-6 divide-y divide-border">
            {FACTS.map((fact) => (
              <div key={fact.label} className="flex flex-col gap-1 py-4 sm:flex-row sm:justify-between sm:gap-8">
                <dt className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground sm:pt-0.5">{fact.label}</dt>
                <dd className="text-sm text-foreground sm:max-w-xs sm:text-right">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-8">
        <h2 className="text-lg font-semibold text-foreground">Media contact</h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          For interviews, data requests, or fact-checking, reach our communications team.
        </p>
        <a
          href="mailto:press@masanawa.app"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          press@masanawa.app
          <ArrowUpRight className="size-4" />
        </a>
      </div>
    </PageShell>
  )
}
