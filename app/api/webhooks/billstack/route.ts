// Billstack webhook receiver.
// Configure in the Billstack dashboard (Developer → Webhooks):
//   https://<your-domain>/api/webhooks/billstack
import { getBillstackSecretKey, getTransaction } from '@/lib/billstack/client'
import type { PaymentNotificationPayload } from '@/lib/billstack/types'
import { verifyWebhookSignature } from '@/lib/billstack/webhook'
import { maybeQualifyReferral } from '@/lib/wallet/referrals'
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

    // 6. Resolve the wallet owner from the reserved-account reference. If no
    //    user maps to it, ACK so Billstack stops retrying an unclaimable event.
    const user = await walletStore.getUserByBillstackRef(reference)
    if (!user) {
      console.warn(
        `[billstack-webhook] No user for account ref ${reference} (tx ${transaction_ref}); acknowledging without credit`,
      )
      return NextResponse.json(ACK)
    }

    const payerName =
      `${payload.data.payer.first_name} ${payload.data.payer.last_name}`.trim() || 'Bank transfer'
    const amount = Number(tx.amount)

    // 7. Credit the wallet atomically — the idempotency log and the MSN ledger
    //    row are written together. Deterministic tx id gives a second dedupe
    //    layer on top of the funding primary key.
    const credited = await walletStore.recordFunding(
      {
        transactionRef: tx.transaction_ref,
        accountReference: reference,
        amount,
        payerName,
        payerAccountNumber: payload.data.payer.account_number,
        receivedAt: tx.created_at,
      },
      {
        userId: user.id,
        txId: `fund_${tx.transaction_ref.replace(/[^a-zA-Z0-9]/g, '')}`,
        note: `Bank deposit — MSN minted from ${payerName}`,
      },
    )

    if (credited) {
      console.log(
        `[billstack-webhook] Credited MSN ${amount} to ${user.username} (${reference}, tx ${transaction_ref})`,
      )
      if (user.notifyTransactions) {
        await walletStore.addNotification({
          userId: user.id,
          title: 'Wallet funded',
          body: `Your wallet was credited with ${amount.toLocaleString('en-NG')}  MSN (₦${amount.toLocaleString('en-NG')}) from ${payerName}.`,
        })
      }
      // If this user was referred, their new cumulative funding may cross the
      // qualification threshold and earn their referrer a bonus. No-ops once
      // already qualified or if the user wasn't referred.
      await maybeQualifyReferral(user.id)
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
