import { SendFlow } from '@/components/wallet/send-flow'
import { requireUser } from '@/lib/auth/session'
import { getHoldings } from '@/lib/wallet/holdings'

export default async function SendPage() {
  const user = await requireUser()
  const holdings = await getHoldings(user.id)
  return <SendFlow holdings={holdings} />
}
