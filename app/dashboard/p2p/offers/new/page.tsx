import { requireUser } from '@/lib/auth/session'
import { getNgnRates } from '@/lib/wallet/prices'
import { NewOfferClient } from './new-offer-client'

export default async function NewOfferPage() {
  await requireUser()
  const rates = await getNgnRates()
  return <NewOfferClient rates={rates} />
}
