'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Minus, Plus } from 'lucide-react'
import { FAQS } from './data'

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="scroll-mt-20 border-b border-border">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[0.4fr_0.6fr] lg:gap-16 lg:px-12 lg:py-20">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">System / FAQ</span>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
            Questions, answered.
          </h2>
          <p className="mt-4 text-pretty text-sm leading-relaxed text-muted-foreground">
            The essentials on funding, sending, converting, and cashing out. Still stuck? Our team is
            one message away.
          </p>
          <Link
            href="/contact"
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Contact support
            <ArrowUpRight className="size-4" />
          </Link>
        </div>

        <div className="divide-y divide-border rounded-2xl border border-border bg-card">
          {FAQS.map((item, i) => {
            const isOpen = open === i
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="flex items-baseline gap-3">
                    <span className="font-mono text-xs text-primary">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-base font-medium text-foreground">{item.q}</span>
                  </span>
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
                    {isOpen ? <Minus className="size-4" /> : <Plus className="size-4" />}
                  </span>
                </button>
                {isOpen && (
                  <p className="px-6 pb-6 pl-[3.25rem] text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
