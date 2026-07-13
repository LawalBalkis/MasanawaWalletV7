'use client'

import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export function FlowSuccess({
  title,
  detail,
  onReset,
  resetLabel,
}: {
  title: string
  detail: string
  onReset: () => void
  resetLabel: string
}) {
  return (
    <div
      className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center"
      role="status"
    >
      <CheckCircle2 className="size-10 text-primary" aria-hidden="true" />
      <div>
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mt-1 font-mono text-sm text-muted-foreground">{detail}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onReset}>
          {resetLabel}
        </Button>
        <Button nativeButton={false} render={<Link href="/dashboard" />}>
          Back to dashboard
        </Button>
      </div>
    </div>
  )
}
