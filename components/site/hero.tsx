import Image from 'next/image'
import { ArrowRight, Star } from 'lucide-react'
import { CHAINS } from './data'

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-b from-accent/60 to-background"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-16 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:pb-24 lg:pt-24">
        <div className="flex flex-col items-start">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            Self-custody · Multi-chain
          </span>

          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Your crypto, on every chain, in your hands.
          </h1>

          <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Masanawa is the non-custodial wallet for holding, sending, and tracking assets across
            seven networks — with private keys that never leave your device.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#download"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
            >
              Get the app
              <ArrowRight className="size-4" />
            </a>
            <a
              href="#how"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              See how it works
            </a>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <div className="flex" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="size-4 fill-primary text-primary" />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Trusted by <span className="font-semibold text-foreground">120,000+</span> self-custody
              users
            </p>
          </div>
        </div>

        <div className="relative flex justify-center lg:justify-end">
          <div className="absolute inset-0 -z-10 mx-auto max-w-sm rounded-[2.5rem] bg-primary/10 blur-2xl" />
          <Image
            src="/masanawa-app-mockup.png"
            alt="Masanawa wallet app showing a multi-chain portfolio, quick send actions, and asset balances"
            width={520}
            height={640}
            priority
            className="w-full max-w-sm drop-shadow-xl"
          />
        </div>
      </div>

      <div className="border-y border-border bg-card/50">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:justify-between">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Supported networks
          </p>
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {CHAINS.map((c) => (
              <li key={c} className="text-sm font-medium text-foreground/70">
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
