import { formatNgn } from '@/lib/wallet/assets'
import { ArrowDownToLine, ArrowLeftRight, Banknote, Send } from 'lucide-react'
import Link from 'next/link'

const QUICK_ACTIONS = [
  { href: '/dashboard/fund', label: 'Fund', icon: Banknote },
  { href: '/dashboard/trade', label: 'Buy / Sell', icon: ArrowLeftRight },
  { href: '/dashboard/send', label: 'Send', icon: Send },
  { href: '/dashboard/withdraw', label: 'Withdraw', icon: ArrowDownToLine },
]

export function BalanceOverview({ total, username }: { total: number; username: string }) {
  return (
    <section aria-labelledby="balance-heading">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="balance-heading" className="text-sm font-medium text-muted-foreground">
              Total balance
            </h2>
            <p className="mt-2 font-mono text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {formatNgn(total)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Across naira and crypto · <span className="font-mono text-primary">@{username}</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-secondary px-4 py-3 text-xs font-medium text-secondary-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <action.icon className="size-4 text-primary" aria-hidden="true" />
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
