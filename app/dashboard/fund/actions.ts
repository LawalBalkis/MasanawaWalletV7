'use server'

import { createVirtualAccount, getVirtualAccount } from '@/lib/billstack/client'
import { BillstackError, type BillstackIdType } from '@/lib/billstack/types'
import { billstackReferenceForUser, getCurrentUserId } from '@/lib/wallet/store'

/** Sanitized account details safe to send to the client. Never includes idNumber. */
export interface VirtualAccountDetails {
  bankName: string
  accountNumber: string
  accountName: string
}

export interface AccountActionResult {
  ok: boolean
  account?: VirtualAccountDetails
  error?: string
  /** Field-level validation errors keyed by input name. */
  fieldErrors?: Record<string, string>
}

function toDetails(account: {
  account_number: string
  account_name: string
  bank_name: string
}): VirtualAccountDetails {
  return {
    bankName: account.bank_name,
    accountNumber: account.account_number,
    accountName: account.account_name,
  }
}

function friendlyBillstackMessage(err: unknown): string {
  if (err instanceof BillstackError) {
    const msg = err.apiMessage.toLowerCase()
    if (msg.includes('nin') || msg.includes('bvn') || msg.includes('id')) {
      return 'Your NIN/BVN could not be verified. Please double-check the number and try again.'
    }
    if (msg.includes('reference')) {
      return 'An account with this reference already exists. Please refresh the page.'
    }
    if (err.httpStatus === 401 || err.httpStatus === 403) {
      return 'Payment provider authentication failed. Please contact support.'
    }
    return `Could not create your account: ${err.apiMessage}`
  }
  if (err instanceof Error && err.message.includes('BILLSTACK_SECRET_KEY')) {
    return 'The payment provider is not configured yet. Add the BILLSTACK_SECRET_KEY environment variable.'
  }
  return 'Something went wrong while setting up your account. Please try again.'
}

/**
 * Check whether the current user already has a virtual account on Billstack.
 * Uses the deterministic reference, so accounts survive redeploys without a DB.
 */
export async function checkExistingAccount(): Promise<AccountActionResult> {
  const reference = billstackReferenceForUser(getCurrentUserId())
  try {
    const existing = await getVirtualAccount({ reference })
    const account = existing?.data.account?.[0]
    if (account) {
      return { ok: true, account: toDetails(account) }
    }
    return { ok: true }
  } catch (err) {
    console.error('[v0] checkExistingAccount failed:', err)
    return { ok: false, error: friendlyBillstackMessage(err) }
  }
}

/**
 * Get the user's virtual account, creating a PalmPay one on Billstack if none exists.
 * PalmPay requires NIN or BVN for KYC.
 */
export async function getOrCreateVirtualAccount(
  _prev: AccountActionResult | null,
  formData: FormData,
): Promise<AccountActionResult> {
  const firstName = String(formData.get('firstName') ?? '').trim()
  const lastName = String(formData.get('lastName') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').replace(/[\s-]/g, '')
  const idType = String(formData.get('idType') ?? '') as BillstackIdType
  const idNumber = String(formData.get('idNumber') ?? '').replace(/\s/g, '')

  // Validate
  const fieldErrors: Record<string, string> = {}
  if (firstName.length < 2) fieldErrors.firstName = 'Enter your first name'
  if (lastName.length < 2) fieldErrors.lastName = 'Enter your last name'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = 'Enter a valid email address'
  if (!/^(?:\+234\d{10}|0\d{10})$/.test(phone)) {
    fieldErrors.phone = 'Enter a valid Nigerian phone number (e.g. 08012345678)'
  }
  if (idType !== 'nin' && idType !== 'bvn') fieldErrors.idType = 'Choose NIN or BVN'
  if (!/^\d{11}$/.test(idNumber)) fieldErrors.idNumber = 'Must be exactly 11 digits'

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, error: 'Please fix the highlighted fields.' }
  }

  const reference = billstackReferenceForUser(getCurrentUserId())

  try {
    // Recover an existing account first — never create duplicates.
    const existing = await getVirtualAccount({ reference })
    const existingAccount = existing?.data.account?.[0]
    if (existingAccount) {
      return { ok: true, account: toDetails(existingAccount) }
    }

    const created = await createVirtualAccount({
      reference,
      email,
      phone,
      firstName,
      lastName,
      bank: 'PALMPAY',
      idType,
      idNumber,
    })

    const account = created.data.account?.[0]
    if (!account) {
      return { ok: false, error: 'Account was created but no details were returned. Please refresh.' }
    }

    return { ok: true, account: toDetails(account) }
  } catch (err) {
    console.error('[v0] getOrCreateVirtualAccount failed:', err)
    return { ok: false, error: friendlyBillstackMessage(err) }
  }
}
