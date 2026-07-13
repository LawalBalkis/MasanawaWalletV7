import { PRODUCT_FEATURES } from './data'

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-8 lg:px-12 lg:py-20">
      <div className="flex flex-col items-center gap-6 border-b border-border pb-8 text-center lg:flex-row lg:items-end lg:justify-between lg:text-left">
        <div className="max-w-2xl">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Product / Features</span>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
            Naira and crypto, working together in one account.
          </h2>
        </div>
        <p className="max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">
          Fund with a bank transfer, buy and sell supported tokens, pay any username, and withdraw naira —
          all from one place.
        </p>
      </div>

      <div className="mt-px grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {PRODUCT_FEATURES.map((f) => (
          <div key={f.title} className="flex flex-col gap-4 bg-card p-7 transition-colors hover:bg-secondary/50">
            <div className="flex items-center justify-between">
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <f.icon className="size-5" />
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                FIG {f.number}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-foreground">{f.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
