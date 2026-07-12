import { Apple, Play } from 'lucide-react'

export function DownloadCta() {
  return (
    <section id="download" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
      <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center sm:px-12 lg:py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary-foreground/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-16 size-64 rounded-full bg-primary-foreground/10"
        />
        <h2 className="relative mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight text-primary-foreground sm:text-4xl">
          Take custody of your crypto today.
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-pretty text-lg leading-relaxed text-primary-foreground/80">
          Download Masanawa and hold, send, and track assets across seven chains — securely, and
          entirely on your terms.
        </p>
        <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#download"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:opacity-90"
          >
            <Apple className="size-5" />
            Download for iOS
          </a>
          <a
            href="#download"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary-foreground/30 px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10"
          >
            <Play className="size-5" />
            Get it on Android
          </a>
        </div>
      </div>
    </section>
  )
}
