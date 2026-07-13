import { Button } from '@/components/ui/button'
import { TX_META, txTitle } from '@/components/wallet/transaction-list'
import {
  ALL_TRANSACTIONS,
  assetBySymbol,
  formatAsset,
  formatNgn,
  txById,
} from '@/lib/wallet/demo-data'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Transaction · Masanawa',
}

export function generateStaticParams() {
  return ALL_TRANSACTIONS.map((tx) => ({ id: tx.id }))
}

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const tx = txById(id)
  if (!tx) notFound()

  const meta = TX_META[tx.type]
  const asset = assetBySymbol(tx.asset)
  const isIn = meta.direction === 'in'

  const rows: { label: string; value: string }[] = [
    { label: 'Type', value: meta.label },
    { label: 'Asset', value: `${asset.name} (${asset.symbol})` },
    ...(tx.counterparty ? [{ label: isIn ? 'From' : 'To', value: tx.counterparty }] : []),
    { label: 'NGN value', value: formatNgn(tx.ngnValue) },
    ...(tx.note ? [{ label: 'Note', value: tx.note }] : []),
    {
      label: 'Date',
      value: new Date(tx.date).toLocaleString('en-NG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    },
    { label: 'Reference', value: tx.id.toUpperCase() },
    { label: 'Status', value: tx.status === 'completed' ? 'Completed' : 'Pending' },
  ]

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <Link
        href="/dashboard/activity"
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to activity
      </Link>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <header className="flex flex-col items-center gap-3 border-b border-border bg-secondary/30 px-6 py-8 text-center">
          <span
            className={`flex size-12 items-center justify-center rounded-full ${
              isIn ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground'
            }`}
            aria-hidden="true"
          >
            <meta.icon className="size-5" />
          </span>
          <div>
            <p
              className={`font-mono text-2xl font-semibold ${isIn ? 'text-primary' : 'text-foreground'}`}
            >
              {isIn ? '+' : '−'}
              {formatAsset(tx.amount, asset)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{txTitle(tx)}</p>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              tx.status === 'completed'
                ? 'bg-accent text-accent-foreground'
                : 'bg-secondary text-muted-foreground'
            }`}
          >
            {tx.status === 'completed' ? 'Completed' : 'Pending'}
          </span>
        </header>

        <dl className="flex flex-col divide-y divide-border px-6 py-2">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-muted-foreground">{row.label}</dt>
              <dd className="text-right font-mono text-sm text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <Button nativeButton={false} variant="secondary" size="lg" render={<Link href="/dashboard" />}>
        Back to dashboard
      </Button>
    </div>
  )
}
