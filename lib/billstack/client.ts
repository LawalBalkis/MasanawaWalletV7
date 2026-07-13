// Server-only Billstack API client.
// Base URL and endpoints verified against https://docs.billstack.co/api-reference (v2).
import 'server-only'

import {
  BillstackError,
  type CreateVirtualAccountRequest,
  type CreateVirtualAccountResponse,
  type GetTransactionResponse,
  type GetVirtualAccountRequest,
  type GetVirtualAccountResponse,
} from './types'

const BASE_URL = 'https://api.billstack.co/v2'

export function getBillstackSecretKey(): string {
  const key = process.env.BILLSTACK_SECRET_KEY
  if (!key) {
    throw new Error(
      'BILLSTACK_SECRET_KEY is not set. Add it to your project environment variables.',
    )
  }
  return key
}

async function billstackFetch<T extends { status: boolean; message: string }>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getBillstackSecretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  let json: unknown
  try {
    json = await res.json()
  } catch {
    throw new BillstackError(res.status, 'Invalid JSON response from Billstack')
  }

  const parsed = json as T & { status?: boolean; message?: string }

  if (!res.ok || parsed.status !== true) {
    throw new BillstackError(res.status, parsed.message ?? 'Unknown Billstack error')
  }

  return parsed
}

/**
 * Create a reserved virtual account a customer can pay into.
 * POST /thirdparty/generateVirtualAccount/
 * One bank per request. PALMPAY additionally requires idType ('nin'|'bvn') + idNumber.
 */
export async function createVirtualAccount(
  req: CreateVirtualAccountRequest,
): Promise<CreateVirtualAccountResponse> {
  if (req.bank === 'PALMPAY' && (!req.idType || !req.idNumber)) {
    throw new Error('PALMPAY accounts require idType and idNumber')
  }
  return billstackFetch<CreateVirtualAccountResponse>(
    '/thirdparty/generateVirtualAccount/',
    { ...req },
  )
}

/**
 * Retrieve a reserved account by merchant `reference` or customer `email`.
 * POST /thirdparty/getVirtualAccount/
 * Returns null if Billstack reports the account as not found.
 */
export async function getVirtualAccount(
  req: GetVirtualAccountRequest,
): Promise<GetVirtualAccountResponse | null> {
  if (!req.reference && !req.email) {
    throw new Error('Provide either reference or email to look up an account')
  }
  try {
    return await billstackFetch<GetVirtualAccountResponse>(
      '/thirdparty/getVirtualAccount/',
      { ...req },
    )
  } catch (err) {
    // Treat "not found" style failures as null so callers can create lazily.
    if (err instanceof BillstackError && (err.httpStatus === 404 || /not\s*found|no\s*account/i.test(err.apiMessage))) {
      return null
    }
    throw err
  }
}

/**
 * Retrieve a transaction by its session id (= transaction_ref / wiaxy_ref from the webhook).
 * POST /thirdparty/getTransaction/
 * Used to independently verify webhook payloads before crediting.
 */
export async function getTransaction(sessionId: string): Promise<GetTransactionResponse> {
  return billstackFetch<GetTransactionResponse>('/thirdparty/getTransaction/', {
    session_id: sessionId,
  })
}
