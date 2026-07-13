// Billstack webhook receiver.
// Configure in the Billstack dashboard (Developer → Webhooks):
//   https://<your-domain>/api/webhooks/billstack
import { getBillstackSecretKey, getTransaction } from '@/lib/billstack/client'
import type { PaymentNotificationPayload } from '@/lib/billstack/types'
import { verifyWebhookSignature } from '@/lib/billstack/webhook'
import { walletStore } from '@/lib/wallet/store'
import { NextResponse } from 'next/server'

const ACK = { status: true, message: 'successful' }

export async function POST(request: Request) {
  // 1. Read the raw body BEFORE parsing — required for signature verification.
  const rawBody = await request.text()

  // 2. Verify x-wiaxy-signature-256 (HMAC-SHA256 of "{timestamp}.{rawBody}").
  let secretKey: string
  try {
    secretKey = getBillstackSecretKey()
  } catch {
    console.error('[billstack-webhook] BILLSTACK_SECRET_KEY is not configured')
    return NextResponse.json({ status: false, message: 'Not configured' }, { status: 500 })
  }

  const verification = verifyWebhookSignature(
    rawBody,
    request.headers.get('x-wiaxy-signature-256'),
    request.headers.get('x-wiaxy-timestamp'),
    secretKey,
  )
  if (!verification.valid) {
    console.warn(`[billstack-webhook] Rejected: ${verification.reason}`)
    return NextResponse.json({ status: false, message: 'Invalid signature' }, { status: 401 })
  }

  // 3. Parse the (now trusted) payload.
  let payload: PaymentNotificationPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ status: false, message: 'Invalid JSON' }, { status: 400 })
  }

  // Acknowledge unknown events so Billstack doesn't retry them forever.
  if (payload.event !== 'PAYMENT_NOTIFICATION') {
    return NextResponse.json(ACK)
  }

  const { transaction_ref, reference } = payload.data
  if (!transaction_ref || !reference) {
    return NextResponse.json({ status: false, message: 'Malformed payload' }, { status: 400 })
  }

  // 4. Idempotency — skip transactions we've already credited.
  if (await walletStore.hasFunding(transaction_ref)) {
    return NextResponse.json(ACK)
  }

  // 5. Never trust the webhook amount alone — cross-verify with the
  //    Get Transaction API using the session id (= transaction_ref).
  try {
    const verified = await getTransaction(transaction_ref)
    const tx = verified.data

    if (tx.status !== 'SUCCESS') {
      console.warn(
        `[billstack-webhook] Transaction ${transaction_ref} not successful (status: ${tx.status}), skipping credit`,
      )
      return NextResponse.json(ACK)
    }

    if (tx.reference !== reference) {
      console.warn(
        `[billstack-webhook] Reference mismatch for ${transaction_ref}: webhook=${reference} api=${tx.reference}`,
      )
      return NextResponse.json(ACK)
    }

    // 6. Credit the wallet — amount comes from the verified API record.
    const credited = await walletStore.recordFunding({
      transactionRef: tx.transaction_ref,
      accountReference: reference,
      amount: Number(tx.amount),
      payerName: `${payload.data.payer.first_name} ${payload.data.payer.last_name}`.trim(),
      payerAccountNumber: payload.data.payer.account_number,
      receivedAt: tx.created_at,
    })

    if (credited) {
      console.log(
        `[billstack-webhook] Credited NGN ${tx.amount} to account ref ${reference} (tx ${transaction_ref})`,
      )
    }
  } catch (err) {
    // Verification call failed — respond non-200 so Billstack retries later.
    console.error('[billstack-webhook] Failed to verify transaction:', err)
    return NextResponse.json(
      { status: false, message: 'Verification failed, retry' },
      { status: 500 },
    )
  }

  // 7. Acknowledge with the exact body Billstack expects.
  return NextResponse.json(ACK)
}
