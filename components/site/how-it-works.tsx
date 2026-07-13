import { ArrowRight } from 'lucide-react'
import { MONEY_FLOW } from './data'

export function HowItWorks() {
  return (
    <section id="flow" className="scroll-mt-20 border-b border-border bg-secondary">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8 lg:px-12 lg:py-20">
        <div className="flex flex-col gap-4 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">System / How money moves</span>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
              Bank in. Bank out. Crypto in between.
            </h2>
          </div>
          <p className="max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">
            One clear path: fund, buy, send to any @username, then cash out to a Nigerian bank when
            you&apos;re ready.
          </p>
        </div>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MONEY_FLOW.map((step, i) => (
            <li key={step.step} className="relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40 hover:bg-card/80 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <step.icon className="size-5" />
                </span>
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{step.step}</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{step.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
              </div>
              {i < MONEY_FLOW.length - 1 && (
                <ArrowRight
                  aria-hidden="true"
                  className="absolute -right-4 top-1/2 z-10 hidden size-5 -translate-y-1/2 text-primary lg:block"
                />
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
