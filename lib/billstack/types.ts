// Billstack API types.
// Verified against https://docs.billstack.co/api-reference (v2) on 2026-07-13.

/** Banks supported for virtual account generation. One bank per request. */
export type BillstackBank = '9PSB' | 'SAFEHAVEN' | 'PALMPAY'

/** Identity type required when bank is PALMPAY (lowercase per API docs). */
export type BillstackIdType = 'nin' | 'bvn'

/** A provider bank account returned inside `data.account[]`. */
export interface BillstackAccount {
  account_number: string
  account_name: string
  bank_name: string
  bank_id: string
  created_at: string
}

/** Customer details echoed back in `data.meta`. */
export interface BillstackCustomerMeta {
  firstName: string
  lastName: string
  email: string
}

// ---------------------------------------------------------------------------
// Create Account — POST /thirdparty/generateVirtualAccount/
// ---------------------------------------------------------------------------

export interface CreateVirtualAccountRequest {
  /** A unique merchant reference for the reserved account. */
  reference: string
  email: string
  phone: string
  firstName: string
  lastName: string
  bank: BillstackBank
  /** Required when bank is PALMPAY. */
  idType?: BillstackIdType
  /** Required when bank is PALMPAY. The NIN or BVN value matching idType. */
  idNumber?: string
}

export interface CreateVirtualAccountResponse {
  status: boolean
  message: string
  data: {
    /** The Billstack reserved account reference (e.g. "R-XXXXXXXXXXX"). */
    reference: string
    account: BillstackAccount[]
    meta: BillstackCustomerMeta
  }
}

// ---------------------------------------------------------------------------
// Get Account — POST /thirdparty/getVirtualAccount/
// (send either `reference` or `email`)
// ---------------------------------------------------------------------------

export interface GetVirtualAccountRequest {
  /** The merchant reference supplied at creation. */
  reference?: string
  /** The customer's email address. */
  email?: string
}

export interface GetVirtualAccountResponse {
  status: boolean
  message: string
  data: {
    /** The Billstack reference for the reserved account. */
    reference: string
    /** The reference you supplied at creation. */
    merchant_reference: string
    /** The customer email the account belongs to. */
    customer: string
    /** All provider accounts reserved for this customer (may span banks). */
    account: BillstackAccount[]
    meta: BillstackCustomerMeta
  }
}

// ---------------------------------------------------------------------------
// Get Transaction — POST /thirdparty/getTransaction/
// ---------------------------------------------------------------------------

export interface GetTransactionRequest {
  /** The session id, same value as `transaction_ref` / `wiaxy_ref` in the webhook. */
  session_id: string
}

export type BillstackTransactionStatus = 'SUCCESS' | 'PENDING' | 'FAILED'

export interface BillstackTransaction {
  /** The reference of the virtual account the payment came into. */
  reference: string
  session_id: string
  transaction_ref: string
  amount: number
  status: BillstackTransactionStatus
  is_settled: boolean
  method: string
  bank: string
  /** The virtual account number that received the payment. */
  nuban: string
  account_name: string
  customer: string
  email: string
  created_at: string
}

export interface GetTransactionResponse {
  status: boolean
  message: string
  data: BillstackTransaction
}

// ---------------------------------------------------------------------------
// Webhook — PAYMENT_NOTIFICATION event
// ---------------------------------------------------------------------------

export interface PaymentNotificationPayload {
  event: 'PAYMENT_NOTIFICATION'
  data: {
    type: 'RESERVED_ACCOUNT_TRANSACTION'
    /** The reference of the virtual account that was paid into. */
    reference: string
    merchant_reference: string
    /** The interbank reference for this transaction. */
    wiaxy_ref: string
    transaction_ref: string
    /** Amount received (delivered as a string in the webhook payload). */
    amount: string | number
    created_at: string
    account: {
      account_number: string
      account_name: string
      bank_name: string
      created_at: string
    }
    payer: {
      account_number: string
      first_name: string
      last_name: string
      createdAt: string
    }
  }
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Generic error body Billstack returns on failure. */
export interface BillstackErrorBody {
  status: false
  message: string
}

/** Thrown by the client when a request to Billstack fails. */
export class BillstackError extends Error {
  readonly httpStatus: number
  readonly apiMessage: string

  constructor(httpStatus: number, apiMessage: string) {
    super(`Billstack request failed (${httpStatus}): ${apiMessage}`)
    this.name = 'BillstackError'
    this.httpStatus = httpStatus
    this.apiMessage = apiMessage
  }
}
