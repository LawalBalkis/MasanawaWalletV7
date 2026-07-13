import { SECURITY_POINTS } from './data'

export function Security() {
  return (
    <section id="security" className="scroll-mt-20 border-b border-border">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20 lg:px-12 lg:py-20">
        <div><span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Account safety</span><h2 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.035em] text-foreground sm:text-5xl">Control that stays visible at every step.</h2><p className="mt-5 text-pretty text-lg leading-relaxed text-muted-foreground">From bank funding to a final withdrawal, Masanawa gives you clear transaction details and protected confirmation points.</p><div className="mt-10 border-l-2 border-primary pl-5"><p className="text-sm font-semibold text-foreground">Check. Review. Confirm.</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Crypto transfers can be irreversible. We make the important details easy to see before money moves.</p></div></div>
        <div className="grid sm:grid-cols-2">{SECURITY_POINTS.map((point) => <article key={point.title} className="border border-border bg-card p-6 sm:p-8"><span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground"><point.icon className="size-5" /></span><h3 className="mt-8 text-lg font-semibold text-foreground">{point.title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{point.body}</p></article>)}</div>
      </div>
    </section>
  )
}
