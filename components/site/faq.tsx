'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import { FAQS } from './data'

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:py-28">
      <div className="text-center">
        <span className="font-mono text-xs uppercase tracking-widest text-primary">FAQ</span>
        <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Questions, answered.
        </h2>
      </div>

      <div className="mt-12 divide-y divide-border rounded-2xl border border-border bg-card">
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
                <span className="text-base font-medium text-foreground">{item.q}</span>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
                  {isOpen ? <Minus className="size-4" /> : <Plus className="size-4" />}
                </span>
              </button>
              {isOpen && (
                <p className="px-6 pb-6 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
