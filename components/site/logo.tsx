import { BRAND } from './data'

export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label={`${BRAND} logomark`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="8.5" className="fill-primary" />
      {/* Geometric "M" built from an in/out money-flow motif */}
      <path
        d="M6.5 23.5V9.5L16 17.25L25.5 9.5V23.5"
        className="stroke-primary-foreground"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="22.5" r="1.7" className="fill-primary-foreground" />
    </svg>
  )
}

export function Logo({
  className = '',
  showWordmark = true,
}: {
  className?: string
  showWordmark?: boolean
}) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className="size-8" />
      {showWordmark && (
        <span className="text-lg font-semibold tracking-tight text-foreground">{BRAND}</span>
      )}
    </span>
  )
}
