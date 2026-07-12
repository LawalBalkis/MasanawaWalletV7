import { BRAND } from './data'

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2 3 6.5v5c0 5 3.8 8.9 9 10.5 5.2-1.6 9-5.5 9-10.5v-5L12 2Z" />
          <path d="m8.5 12 2.5 2.5 4.5-5" />
        </svg>
      </span>
      <span className="text-lg font-semibold tracking-tight text-foreground">{BRAND}</span>
    </span>
  )
}
