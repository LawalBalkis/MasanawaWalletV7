import { SECURITY_POINTS } from './data'

export function Security() {
  return (
    <section id="security" className="border-y border-border bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-28">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">Security</span>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Built so that only you can ever touch your funds.
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Masanawa is non-custodial to its core. There is no account we can freeze and no key we
            can hand over — because your keys live only on your device.
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-6">
            <div>
              <dt className="text-3xl font-semibold text-foreground">0</dt>
              <dd className="mt-1 text-sm text-muted-foreground">Keys stored on our servers</dd>
            </div>
            <div>
              <dt className="text-3xl font-semibold text-foreground">7</dt>
              <dd className="mt-1 text-sm text-muted-foreground">Chains, one secure vault</dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col gap-4">
          {SECURITY_POINTS.map((p) => (
            <div
              key={p.title}
              className="flex gap-4 rounded-2xl border border-border bg-card p-6"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <p.icon className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-foreground">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
