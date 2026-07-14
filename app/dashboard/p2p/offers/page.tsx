import { requireUser } from '@/lib/auth/session'
import { formatAsset, formatMsn, type AssetSymbol } from '@/lib/wallet/assets'
import { walletStore } from '@/lib/wallet/store'
import { MyOffersClient } from './my-offers-client'

export default async function MyOffersPage() {
  const user = await requireUser()
  const offers = await walletStore.listP2POffers({ makerId: user.id, limit: 100 })

  const offersWithMeta = offers.map((o) => ({
    id: o.id,
    side: o.side,
    asset: o.asset,
    priceMsn: o.priceMsn,
    totalAmount: o.totalAmount,
    remainingAmount: o.remainingAmount,
    status: o.status,
    createdAt: o.createdAt,
  }))

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">My Offers</h1>
      <MyOffersClient offers={offersWithMeta} />
    </div>
  )
}
