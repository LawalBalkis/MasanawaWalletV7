# Masanawa Wallet — Project Status

Last updated: 2026-07-13 (branch `billstack-api-development`)

This document tracks required manual setup steps and an audit of what is real
vs. demo in the app, so future work knows exactly where to pick up.

---

## 1. Required manual setup

### Billstack webhook URL (NOT yet done — required for auto-crediting)

Payments into virtual accounts are pushed by Billstack via webhook. Until this
is configured, transfers into a virtual account will NOT credit the wallet.

1. Log in to the Billstack dashboard.
2. Go to **Developer → Webhooks**.
3. Set the webhook URL to:

   ```
   https://<your-production-domain>/api/webhooks/billstack
   ```

4. The route verifies each request by hashing the raw body with
   `BILLSTACK_SECRET_KEY` (HMAC) — no extra webhook secret needs to be
   configured, but the secret key env var must match the dashboard key.

### Environment variables

| Variable | Status | Purpose |
| --- | --- | --- |
| `BILLSTACK_SECRET_KEY` | ✅ set | Create/fetch virtual accounts, verify webhooks |

---

## 2. Billstack integration — what is implemented

- `lib/billstack/client.ts` — typed API client (create + get reserved account).
- `lib/billstack/webhook.ts` — HMAC signature verification.
- `app/api/webhooks/billstack/route.ts` — idempotent payment webhook handler.
- `app/dashboard/fund/` — KYC form (NIN/BVN), account details display, server
  actions with field-level validation. Form values repopulate after errors
  (sensitive ID number is never echoed back).
- Deterministic per-user account reference (`masanawa_<userId>`) so accounts
  are recovered from Billstack, never duplicated — even with no database.

---

## 3. Audit — missing features and important implementations

### Critical (blocks production)

| Gap | Where | Notes |
| --- | --- | --- |
| No database | `lib/wallet/store.ts` | Funding records are in-memory and reset on redeploy/cold start. Swap `InMemoryWalletStore` for a Neon + Drizzle implementation. The `WalletStore` interface is the only contract to satisfy. |
| No real authentication | `app/auth/*`, `lib/wallet/store.ts` | Sign-in/sign-up/PIN pages are UI-only. `getCurrentUserId()` returns a hardcoded demo user. Recommended: Better Auth on Neon. |
| Wallet balances are demo data | `lib/wallet/demo-data.ts` | Dashboard, send, trade, withdraw all read hardcoded balances. Webhook-credited fundings are stored but not reflected in the displayed NGN balance. |
| Transaction PIN is client-only | `components/wallet/pin-dialog.tsx` | Any 4 digits are accepted; nothing is verified server-side. |

### Major (feature gaps)

| Gap | Where | Notes |
| --- | --- | --- |
| Send, trade, withdraw have no backend | `app/dashboard/{send,trade,withdraw}` | All three flows are complete UIs that end in a toast — no server action, no balance mutation, no transaction record. |
| No crypto withdrawal flow | — | Tier 1 permits crypto withdrawals (`lib/wallet/tiers.ts`), but there is no UI/backend to send crypto to an external address. The Withdraw page is bank-only. |
| Bank account name resolution is fake | `lib/wallet/demo-data.ts` → `resolveBankAccount` | Needs a real name-enquiry API (e.g. Billstack/Paystack resolve endpoints). |
| Crypto prices are hardcoded | `lib/wallet/demo-data.ts` | `ngnRate` values and `priceHistory()` are static/pseudo-random. Needs a market data feed. |
| Deposit addresses are static demo strings | `DEPOSIT_ADDRESSES` | Real per-user deposit addresses require a custody/chain integration. |
| Notifications are static | `DEMO_NOTIFICATIONS` | No real notification generation or read-state persistence. |
| Settings don't persist | `app/dashboard/settings` | Profile, toggles, and beneficiary removal are local state only. |
| Tier upgrades not implemented | `lib/wallet/tiers.ts` | Tier is hardcoded to Tier 1; upgrade button is a stub. Needs KYC verification flows for Tier 2/3. |

### Minor / hardening

- No rate limiting on the fund server action or webhook route.
- Daily withdrawal limits defined in `lib/wallet/tiers.ts` are enforced per
  single withdrawal only — daily aggregation needs the database.
- 2FA and biometric toggles are cosmetic.
- No email verification on sign-up (UI exists at `app/auth/verify` but is not wired).
- Mobile app (`mobile/`) has pre-existing TypeScript errors from missing Expo
  dependencies — unrelated to the web app, but should be resolved before
  mobile work resumes.

---

## 4. Verification tiers

Defined in `lib/wallet/tiers.ts` — the single source of truth for limits.
Shown to users in **Settings → Verification tier** and enforced on the
Withdraw page.

| | Tier 1 — Verified | Tier 2 — Enhanced | Tier 3 — Full |
| --- | --- | --- | --- |
| Requirement | NIN or BVN | + address verification | + ID document & selfie |
| Per withdrawal | ₦100,000 | ₦1,000,000 | No limit |
| Daily bank withdrawals | ₦300,000 | ₦5,000,000 | No limit |
| Daily crypto withdrawals | ₦300,000 | ₦5,000,000 | No limit |
| Max balance | ₦1,000,000 | ₦10,000,000 | No limit |
| Crypto withdrawals | ✅ Allowed | ✅ Allowed | ✅ Allowed |

Note: crypto withdrawals are allowed from Tier 1 (within the daily
NGN-equivalent limit), per product decision on 2026-07-13.

---

## 5. Recommended next steps (in order)

1. Connect Neon + Drizzle and implement `WalletStore` against it.
2. Add Better Auth (email + password) and replace `getCurrentUserId()`.
3. Wire real NGN balance = webhook fundings − withdrawals/trades.
4. Implement send/trade/withdraw server actions with PIN verification and
   tier-limit enforcement (including daily aggregates).
5. Build the crypto withdrawal flow (Tier 1+).
6. Configure the Billstack webhook URL in production (section 1).
