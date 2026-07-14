import { BalanceOverview } from '@/components/wallet/balance-overview'
import { requireUser } from '@/lib/auth/session'
import { getHoldings, totalNgnValue } from '@/lib/wallet/holdings'
import { walletStore, type P2POfferRecord } from '@/lib/wallet/store'
import { getNgnRates } from '@/lib/wallet/prices'
import { formatAsset, formatMsn, formatNgn, type AssetSymbol } from '@/lib/wallet/assets'
import Link from 'next/link'
import { P2PMarketplaceClient } from './marketplace-client'

const CRYPTO_ASSETS: AssetSymbol[] = ['USDT', 'USDC', 'BTC', 'ETH', 'SOL']

export default async function P2PMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const user = await requireUser()
  const params = await searchParams
  const assetFilter = params.asset as AssetSymbol | undefined
  const sideFilter = params.side as 'buy' | 'sell' | undefined

  const [holdings, offers, rates] = await Promise.all([
    getHoldings(user.id),
    walletStore.listP2POffers({ status: 'active', asset: assetFilter, side: sideFilter, limit: 50 }),
    getNgnRates(),
  ])

  const total = totalNgnValue(holdings)
  const msnBalance = holdings.find((h) => h.symbol === 'MSN')?.balance ?? 0

  const offersWithMeta = await Promise.all(
    offers.map(async (offer) => {
      const maker = await walletStore.getUserById(offer.makerId)
      return {
        ...offer,
        makerName: maker?.name ?? 'Unknown',
        makerUsername: maker?.username ?? 'unknown',
      }
    }),
  )

  return (
    <div className="flex flex-col gap-8">
      <BalanceOverview total={total} username={user.username} msnBalance={msnBalance} />

      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">P2P Marketplace</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Trade crypto with other users. Escrow-protected, instant settlement.
            </p>
          </div>
          <Link
            href="/dashboard/p2p/offers/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Create offer
          </Link>
        </div>

        <form className="flex flex-wrap gap-3">
          <select
            name="asset"
            defaultValue={assetFilter ?? ''}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
          >
            <option value="">All assets</option>
            {CRYPTO_ASSETS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select
            name="side"
            defaultValue={sideFilter ?? ''}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
          >
            <option value="">All sides</option>
            <option value="sell">Buy crypto (sell MSN)</option>
            <option value="buy">Sell crypto (buy MSN)</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Filter
          </button>
        </form>

        <P2PMarketplaceClient offers={offersWithMeta} userId={user.id} rates={rates} />
      </div>
    </div>
  )
}
