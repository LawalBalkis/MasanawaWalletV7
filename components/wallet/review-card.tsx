'use client'

import { Button } from '@/components/ui/button'

export interface ReviewRow {
  label: string
  value: string
  emphasize?: boolean
}

export function ReviewCard({
  heading = 'Review before you confirm',
  rows,
  confirmLabel,
  onConfirm,
  onBack,
}: {
  heading?: string
  rows: ReviewRow[]
  confirmLabel: string
  onConfirm: () => void
  onBack: () => void
}) {
  return (
    <section
      className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6"
      aria-labelledby="review-heading"
    >
      <h2 id="review-heading" className="text-sm font-medium text-muted-foreground">
        {heading}
      </h2>
      <dl className="flex flex-col divide-y divide-border">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 py-3">
            <dt className="text-sm text-muted-foreground">{row.label}</dt>
            <dd
              className={`text-right font-mono text-sm ${
                row.emphasize ? 'font-semibold text-foreground' : 'text-foreground'
              }`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button size="lg" className="sm:flex-1" onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button size="lg" variant="secondary" className="sm:flex-1" onClick={onBack}>
          Go back
        </Button>
      </div>
    </section>
  )
}
