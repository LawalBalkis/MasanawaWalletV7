import { ASSETS } from './data'

export function Assets() {
  return (
    <section className="border-b border-border bg-secondary">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div className="max-w-2xl"><span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Balances that work together</span><h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Naira at the centre. Crypto within reach.</h2></div><p className="max-w-md text-sm leading-relaxed text-muted-foreground">Availability can vary by asset, network, account status, and market conditions.</p></div>
        <ul className="mt-10 grid grid-cols-2 border-l border-t border-border sm:grid-cols-3 lg:grid-cols-6">{ASSETS.map((asset) => <li key={asset.symbol} className="border-b border-r border-border bg-card p-5"><span className="flex size-10 items-center justify-center rounded-full bg-accent font-mono text-sm font-bold text-accent-foreground">{asset.tone}</span><p className="mt-5 text-base font-semibold text-foreground">{asset.symbol}</p><p className="mt-1 text-xs text-muted-foreground">{asset.name}</p></li>)}</ul>
      </div>
    </section>
  )
}
