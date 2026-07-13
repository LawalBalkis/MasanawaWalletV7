import { formatAsset, formatNgn, type AssetHolding } from '@/lib/wallet/assets'

export function AssetList({ holdings }: { holdings: AssetHolding[] }) {
  return (
    <section aria-labelledby="assets-heading">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="assets-heading" className="text-sm font-medium text-muted-foreground">
          Your assets
        </h2>
      </div>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {holdings.map((asset) => (
          <li key={asset.symbol} className="flex items-center gap-4 px-4 py-3.5 sm:px-6">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-base text-primary"
              aria-hidden="true"
            >
              {asset.glyph}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{asset.name}</p>
              <p className="font-mono text-xs text-muted-foreground">{asset.symbol}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-medium text-foreground">
                {formatAsset(asset.balance, asset)}
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                {formatNgn(asset.balance * asset.ngnRate)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
