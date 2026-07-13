import type { ReactNode } from 'react'
import Link from 'next/link'
import { Navbar } from './navbar'
import { Footer } from './footer'

export function PageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <header className="border-b border-border">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-8 lg:px-12 lg:py-20">
            <nav aria-label="Breadcrumb" className="mb-6">
              <Link
                href="/"
                className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
              >
                Home
              </Link>
              <span className="mx-2 font-mono text-xs text-muted-foreground">/</span>
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">{eyebrow}</span>
            </nav>
            <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-[-0.035em] text-foreground sm:text-5xl">
              {title}
            </h1>
            {description && (
              <p className="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-8 lg:px-12 lg:py-20">{children}</div>
      </main>
      <Footer />
    </div>
  )
}

export function LegalBody({ sections, updated }: { sections: { heading: string; body: string[] }[]; updated: string }) {
  return (
    <div className="grid gap-12 lg:grid-cols-[0.3fr_0.7fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Last updated</p>
        <p className="mt-2 text-sm font-medium text-foreground">{updated}</p>
        <nav className="mt-8 hidden flex-col gap-2 border-l border-border lg:flex">
          {sections.map((section, index) => (
            <a
              key={section.heading}
              href={`#s-${index}`}
              className="-ml-px border-l border-transparent pl-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              {section.heading}
            </a>
          ))}
        </nav>
      </aside>
      <div className="flex flex-col gap-10">
        {sections.map((section, index) => (
          <section key={section.heading} id={`s-${index}`} className="scroll-mt-24">
            <h2 className="flex items-baseline gap-3 text-xl font-semibold text-foreground">
              <span className="font-mono text-sm text-primary">{String(index + 1).padStart(2, '0')}</span>
              {section.heading}
            </h2>
            <div className="mt-4 flex flex-col gap-4">
              {section.body.map((paragraph, i) => (
                <p key={i} className="text-pretty leading-relaxed text-muted-foreground">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
