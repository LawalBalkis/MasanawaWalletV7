import { SECURITY_POINTS } from './data'

export function Security() {
  return (
    <section id="security" className="scroll-mt-20 border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8 lg:px-12 lg:py-20">
        <div className="flex flex-col gap-4 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">System / Account safety</span>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
              Control that stays visible at every step.
            </h2>
          </div>
          <p className="max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">
            Crypto transfers can be irreversible. We make the recipient, amount, rate, and fee easy to
            see before money moves.
          </p>
        </div>

        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {SECURITY_POINTS.map((point, index) => (
            <article key={point.title} className="group flex flex-col bg-card p-6 transition-colors hover:bg-secondary/50">
              <div className="flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <point.icon className="size-5" />
                </span>
                <span className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="mt-8 text-base font-semibold text-foreground">{point.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{point.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
