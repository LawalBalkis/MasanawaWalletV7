// Billstack webhook signature verification.
// Verified against https://docs.billstack.co/api-reference/webhook-security.
import 'server-only'

import crypto from 'crypto'

/** Maximum allowed webhook age in seconds (replay protection). */
const MAX_AGE_SECONDS = 300

export interface WebhookVerification {
  valid: boolean
  reason?: string
}

/**
 * Verify the `x-wiaxy-signature-256` header on a Billstack webhook.
 *
 * The signature is HMAC-SHA256 (hex) of `"{timestamp}.{rawBody}"`, keyed with
 * your Billstack secret key. The raw, unparsed request body MUST be used —
 * re-serialising the JSON can reorder keys and break the signature.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  timestampHeader: string | null,
  secretKey: string,
): WebhookVerification {
  if (!signatureHeader) {
    return { valid: false, reason: 'Missing x-wiaxy-signature-256 header' }
  }
  if (!timestampHeader) {
    return { valid: false, reason: 'Missing x-wiaxy-timestamp header' }
  }

  const timestamp = Number(timestampHeader)
  if (!Number.isFinite(timestamp)) {
    return { valid: false, reason: 'Invalid timestamp header' }
  }

  // Reject stale events (replay protection).
  if (Math.abs(Date.now() / 1000 - timestamp) > MAX_AGE_SECONDS) {
    return { valid: false, reason: 'Webhook timestamp outside allowed window' }
  }

  const expected = crypto
    .createHmac('sha256', secretKey)
    .update(`${timestampHeader}.${rawBody}`)
    .digest('hex')

  const expectedBuf = Buffer.from(expected)
  const receivedBuf = Buffer.from(signatureHeader)

  // timingSafeEqual throws on length mismatch — treat that as invalid.
  if (expectedBuf.length !== receivedBuf.length) {
    return { valid: false, reason: 'Signature mismatch' }
  }

  if (!crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
    return { valid: false, reason: 'Signature mismatch' }
  }

  return { valid: true }
}
