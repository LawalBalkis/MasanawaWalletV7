import { checkExistingAccount } from './actions'
import { FundClient } from './fund-client'

export const dynamic = 'force-dynamic'

export default async function FundPage() {
  // Recover an existing virtual account from Billstack (by deterministic
  // reference) so returning users see their account details immediately.
  let initialAccount = null
  let initialError: string | undefined

  if (process.env.BILLSTACK_SECRET_KEY) {
    const result = await checkExistingAccount()
    if (result.ok && result.account) {
      initialAccount = result.account
    } else if (!result.ok) {
      initialError = result.error
    }
  } else {
    initialError =
      'The payment provider is not configured yet. Add the BILLSTACK_SECRET_KEY environment variable to enable account creation.'
  }

  return <FundClient initialAccount={initialAccount} initialError={initialError} />
}
