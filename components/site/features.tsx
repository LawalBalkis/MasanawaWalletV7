import { PRODUCT_FEATURES } from './data'

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
      <div className="max-w-2xl">
        <span className="font-mono text-xs uppercase tracking-widest text-primary">Features</span>
        <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Everything you need to hold and move crypto with confidence.
        </h2>
        <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
          A complete, security-first toolkit for the multi-chain world — without handing over
          control of your assets.
        </p>
      </div>

      <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {PRODUCT_FEATURES.map((f) => (
          <div key={f.title} className="flex flex-col gap-4 bg-card p-8">
            <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <f.icon className="size-5" />
            </span>
            <h3 className="text-lg font-semibold text-foreground">{f.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
