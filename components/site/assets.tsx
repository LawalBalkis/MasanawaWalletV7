import { ASSETS } from './data'

export function Assets() {
  return (
    <section className="border-y border-border bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <span className="font-mono text-xs uppercase tracking-widest text-primary">Assets</span>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Coins and tokens, all in one place.
            </h2>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
              Hold native assets alongside popular stablecoins and ERC-20, SPL, and TRC-20 tokens.
            </p>
          </div>
        </div>

        <ul className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {ASSETS.map((a) => (
            <li
              key={a.symbol}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-accent font-mono text-xs font-semibold text-accent-foreground">
                {a.symbol.slice(0, 3)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{a.symbol}</p>
                <p className="truncate text-xs text-muted-foreground">{a.name}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
