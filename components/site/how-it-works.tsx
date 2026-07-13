import { STEPS } from './data'

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
      <div className="max-w-2xl">
        <span className="font-mono text-xs uppercase tracking-widest text-primary">
          How it works
        </span>
        <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          From download to your first transfer in minutes.
        </h2>
      </div>

      <ol className="mt-14 grid gap-8 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.label} className="relative flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary font-mono text-sm font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {s.label}
              </span>
            </div>
            <h3 className="mt-2 text-xl font-semibold text-foreground">{s.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
