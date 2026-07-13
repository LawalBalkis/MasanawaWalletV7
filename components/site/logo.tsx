import { BRAND } from './data'

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <span className="font-mono text-sm font-black">M</span>
      </span>
      <span className="text-lg font-semibold tracking-tight text-foreground">{BRAND}</span>
    </span>
  )
}
