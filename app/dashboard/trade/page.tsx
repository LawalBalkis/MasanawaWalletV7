import { TradeFlow } from '@/components/wallet/trade-flow'
import { requireUser } from '@/lib/auth/session'
import { getHoldings } from '@/lib/wallet/holdings'

export default async function TradePage() {
  const user = await requireUser()
  const holdings = await getHoldings(user.id)
  return <TradeFlow holdings={holdings} />
}
