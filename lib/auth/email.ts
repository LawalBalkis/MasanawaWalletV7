// ---------------------------------------------------------------------------
// Transactional email sender. Provider-agnostic and dependency-free.
//
// In production, set RESEND_API_KEY and EMAIL_FROM to deliver real email via
// Resend's REST API. Without them (local/dev), the message is logged to the
// server console so the OTP / reset flows remain fully testable end-to-end.
// ---------------------------------------------------------------------------
import 'server-only'

export interface AuthEmail {
  to: string
  subject: string
  text: string
}

export async function sendAuthEmail({ to, subject, text }: AuthEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM

  if (apiKey && from) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to, subject, text }),
      })
      if (!res.ok) {
        console.error(`[email] Resend responded ${res.status}: ${await res.text()}`)
      }
    } catch (err) {
      console.error('[email] Failed to send via Resend:', err)
    }
    return
  }

  // Dev fallback — no provider configured. Never do this in production.
  console.log(
    `[email] (dev fallback — set RESEND_API_KEY + EMAIL_FROM to send for real)\n` +
      `  To: ${to}\n  Subject: ${subject}\n  ${text}`,
  )
}
