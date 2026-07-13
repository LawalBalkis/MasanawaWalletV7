# Masanawa Platform Audit & Implementation Plan

> Full-platform audit: missing features, admin management capabilities, and the
> implementation plan to close each gap. Companion document to
> `docs/MSN_PLATFORM_UPGRADE_PLAN.md` (MSN token + P2P escrow) — items needed by
> that plan are cross-referenced rather than duplicated.
>
> Audit date: July 2026 · Branch: `masanawa-platform-restructure`

---

## 1. What exists and works today (audited)

| Area | Status | Notes |
|---|---|---|
| Auth (sign-up, sign-in, OTP email verify, password reset) | ✅ | Hashed sessions, scrypt passwords, single-use hashed tokens |
| Transaction PIN (set, verify, change, admin reset) | ✅ | Scrypt-hashed, server-side verification on every money action |
| Ledger-derived balances (no balances table) | ✅ | `transactions` is the single source of truth |
| Fund via Billstack virtual account + webhook | ✅ | Idempotent via `fundings.transaction_ref` PK |
| Send by @username (internal, atomic double-entry) | ✅ | Rate-limited, PIN-gated |
| Buy/sell crypto vs NGN (CoinGecko rates, 5-min cache) | ✅ | Static fallback rates when feed is down |
| Withdraw NGN to bank / crypto to address | ⚠️ | **Simulated** — instant "completed", no real payout rail |
| Tier limits (single/daily withdrawal, per-tier) | ✅ | Enforced in `lib/wallet/actions.ts` |
| Referrals (code, qualification, bonus, withdrawal to wallet) | ✅ | Fixed ₦200 bonus, hardcoded threshold |
| Notifications (in-app, per-preference) | ✅ | No email/push delivery |
| Beneficiaries (save, list, delete) | ✅ | |
| Admin: overview stats, user list/detail/search | ✅ | |
| Admin: freeze/unfreeze, set tier, reset PIN, verify email | ✅ | Guardrails against self/other-admin tampering |
| Admin: manual NGN credit/debit with reason | ✅ | Writes ledger row + audit + notification |
| Admin: fundings list, append-only audit log | ✅ | |
| Marketing site + legal pages (terms, privacy, disclosures…) | ✅ | Content will need MSN-model revision (see MSN plan §1.5) |

---

## 2. Gap audit — user-facing platform

### G-U1 · Withdrawals are simulated (CRITICAL for production)
`withdrawBankAction` writes a `completed` ledger row instantly; no payout API is
called. `resolveBankAccount` returns **fake deterministic names**.
- No real bank transfer (Billstack payout / Paystack Transfers / Flutterwave).
- No `pending → processing → completed/failed` lifecycle; no reversal on failure.
- No admin approval step for large withdrawals.

### G-U2 · Crypto rails are simulated
- Receive page shows demo deposit addresses; nothing watches any chain.
- `withdrawCryptoAction` marks withdrawals completed instantly; nothing is broadcast.
- No custody/omnibus provider integration and no network-fee handling.

### G-U3 · KYC is self-attested — no review, no documents
- Tier upgrades capture address/ID **text** and auto-approve instantly.
- No document/selfie upload, no third-party identity verification, and no
  admin review queue (see G-A3).
- `maxBalanceNgn` per tier is defined in `tiers.ts` but **never enforced** —
  webhook credits deposits regardless of the user's balance cap.

### G-U4 · Security features are toggles without engines
- `twoFactor` boolean exists; there is **no TOTP/email-OTP challenge anywhere**.
- `biometric` boolean exists; nothing implements WebAuthn/passkeys.
- Changing account email in Settings does **not** require re-verification of the
  new address (account-takeover vector).
- No active-session list / "sign out other devices"; sessions have no IP or
  device metadata.
- No login alert notifications (new device / new location).
- Rate limiting is **in-memory** — resets on every deploy and is per-instance.

### G-U5 · Missing everyday wallet features
- No transaction receipt (shareable/printable) or statement export (CSV/PDF).
- No price alerts, despite the `notifyPrices` preference toggle.
- No recurring/scheduled actions (auto-buy, DCA) — optional, low priority.
- No in-app support channel (tickets/chat); Contact page is static.
- No account closure / data export (NDPR privacy compliance).

### G-U6 · Items owned by the MSN plan (not duplicated here)
MSN asset + ledger rules, deposit auto-conversion, withdrawal redemption flow,
P2P escrow marketplace, disputes → see `MSN_PLATFORM_UPGRADE_PLAN.md` Parts 2–4.

---

## 3. Gap audit — admin management capabilities

### G-A1 · No platform-wide transaction explorer
Admins can only see the last 8 transactions of one user at a time. Missing:
- All-transactions view with filters (type, asset, status, date range, amount).
- Search by transaction ID / counterparty / note.
- Per-transaction detail with the linked user and (later) escrow/order context.

### G-A2 · No withdrawal operations queue
Required the moment withdrawals become real (G-U1):
- Pending-withdrawals queue with approve / reject / retry.
- Auto-approve threshold (e.g. < ₦50k) with manual review above it.
- Failed-payout handling and automatic ledger reversal.

### G-A3 · No KYC review queue
- List of pending tier-upgrade requests with submitted data/documents.
- Approve / reject with reason; rejection notifies the user.
- Document image viewing (requires Blob storage).

### G-A4 · No admin & role management
- No way to promote/demote admins from the UI (role is set in the DB by hand).
- Single flat `admin` role — no super-admin vs support-agent distinction.
- No forced sign-out of a user's sessions (needed when freezing a compromised account).

### G-A5 · No platform configuration panel
Everything operational is hardcoded in source (`FEES`, tier limits, referral
bonus ₦200 and its qualification threshold, min trade ₦1,000, min withdrawal
₦500). Changing any of them requires a deploy.

### G-A6 · No financial reporting / treasury view
- No fee-revenue report (sum of `feeNgn` by period/type).
- No platform liability view (sum of all user balances per asset) — essential
  for the MSN reserve model ("MSN in circulation must equal NGN reserve").
- No daily inflow/outflow chart, no export.

### G-A7 · No user communication tools
- No broadcast announcement (all users / segment) into the notifications feed.
- No direct admin → user message beyond the fixed strings on existing actions.

### G-A8 · Funding reconciliation is view-only
`/admin/fundings` lists deposits including unmatched ones (payment received on
a reference that resolves to no user), but there's no action to re-assign a
payment to a user or mark it refunded.

### G-A9 · Audit log lacks tooling
- No filter by actor / action / target / date, no search, no CSV export.
- No IP / user-agent capture on privileged actions.

### G-A10 · Missing minor admin utilities
- Delete/anonymise user (NDPR), view user beneficiaries, view user referral
  tree, per-user notes for support context.
- System health: webhook delivery failures, price-feed status, email-send failures.

---

## 4. Implementation plan

Ordering principle: **security holes first, then admin operations (cheap, high
leverage), then real-money rails, then growth features.** Phases D and E can
run in parallel with the MSN plan's phases.

### Phase A — Security hardening (closes G-U4) ⬜
1. **Email-change re-verification** — changing email issues an OTP to the new
   address; email only swaps after confirmation. Reuses `auth_tokens` with a new
   `kind: 'email_change'` (store pending email in the token detail).
2. **Two-factor auth (email OTP)** — when `twoFactor` is on, sign-in requires a
   6-digit emailed code after the password. Reuses the existing OTP machinery.
   (TOTP authenticator-app support can follow later.)
3. **Session management** — add `ip`, `userAgent`, `lastSeenAt` to `sessions`;
   Settings shows active sessions with per-session and "sign out all" revocation.
4. **Login alerts** — notification (and email) on sign-in from a new device.
5. **Durable rate limiting** — move `lib/auth/rate-limit.ts` counters to a
   Postgres table (or Redis if added later) so limits survive deploys.
6. Drop or implement the `biometric` toggle (recommend: hide until WebAuthn ships).

**Schema:** alter `sessions`; new `rate_limits` table. **New files:** none major —
extends `lib/auth/*` and `settings-client.tsx`.

### Phase B — Admin operations suite (closes G-A1, G-A5, G-A6, G-A9, G-A10) ⬜
1. **Transaction explorer** — `/admin/transactions` with filters, search,
   pagination; store method `listAllTransactions({ filters })`.
2. **Platform config table** — `platform_settings` (key/value JSON) + a typed
   accessor `lib/config.ts` with in-code defaults. Admin page `/admin/settings`
   edits fees, min amounts, referral bonus/threshold; every change is audited.
   All hardcoded constants (`FEES`, minimums, bonus) read through it.
3. **Reports** — `/admin/reports`: fee revenue by period, total liabilities per
   asset (drives the MSN reserve dashboard later), daily inflow/outflow, CSV export.
4. **Audit log tooling** — filters (actor, action, target, date), search, CSV
   export; capture IP + user-agent in `admin_audit_log`.
5. **Admin role management** — `/admin/team`: promote/demote (super-admin only —
   add `role: 'superadmin'`), forced sign-out of any user's sessions.
6. **Funding reconciliation actions** — re-assign an unmatched funding to a user
   (writes the fund ledger row) or mark it refunded; both audited.
7. **Broadcast announcements** — `/admin/announcements`: compose → inserts a
   notification for all (or segmented) users; audited.

### Phase C — KYC review pipeline (closes G-U3, G-A3) ⬜
1. New `kyc_requests` table: `id, userId, requestedTier, payload (JSON),
   documentUrls, status (pending/approved/rejected), reviewerId, reason, timestamps`.
2. Tier-upgrade dialog submits a **request** instead of auto-upgrading; Tier 3
   adds document + selfie upload (requires **Blob integration**, private access).
3. `/admin/kyc` queue: view submissions + documents, approve (sets tier) or
   reject with a reason; user is notified either way.
4. Enforce `maxBalanceNgn` at credit points (webhook funding, receives): credit
   is still recorded but the user is prompted to upgrade; block *new* deposits
   past the cap per compliance preference (config flag from Phase B-2).
5. Optional provider swap point: NIN/BVN + liveness via an identity API
   (e.g. Dojah/Smile ID) replacing manual review for Tiers 1–2.

### Phase D — Real withdrawal rail (closes G-U1, G-A2) ⬜
1. **Real name enquiry** — replace the fake `resolveBankAccount` with the
   payment provider's account-resolution API.
2. **Withdrawal lifecycle** — new `withdrawals` table (`id, userId, txId, bank,
   account, amount, fee, status: pending/processing/completed/failed/rejected,
   providerRef, failureReason`). Ledger row is written at request time with
   `status: 'pending'`; balance math already excludes nothing (amount is
   negative), so funds are effectively held.
3. **Payout provider integration** — Billstack payout API (or Paystack
   Transfers) + a payout-status webhook route; on failure, write a reversing
   ledger row and notify the user.
4. **Admin approval queue** — `/admin/withdrawals`: auto-process below the
   configurable threshold (Phase B-2), manual approve/reject above it; all audited.
5. Update the withdraw flow UI to show pending status honestly (activity page
   already renders `status`).

### Phase E — Wallet quality-of-life (closes G-U5) ⬜
1. **Receipts** — shareable transaction receipt view (print-friendly) from the
   activity detail page.
2. **Statements** — CSV export of transactions (date-range picker); PDF later.
3. **Price alerts** — `price_alerts` table (`userId, asset, direction, targetNgn`),
   checked by a cron route (Vercel Cron) against `getNgnRates()`; fires a
   notification and honours `notifyPrices`.
4. **Support tickets** — minimal `support_tickets` + `ticket_messages` tables,
   user thread in dashboard, admin inbox `/admin/support`.
5. **Account closure & data export** — self-service NDPR flow: export JSON of
   my data; request closure (blocked while balance > 0), which anonymises PII
   and revokes sessions; audited.

### Phase F — items delegated to the MSN plan ⬜
MSN asset, ledger migration, P2P escrow marketplace, dispute management, and
the reserve dashboard are specified in `MSN_PLATFORM_UPGRADE_PLAN.md`. Note the
dependencies flowing *into* that work from this plan:
- Phase B-2 platform config → escrow fee & limits tuning.
- Phase B-3 liabilities report → MSN reserve dashboard.
- Phase C KYC queue → P2P seller eligibility gating.
- Phase D withdrawal lifecycle → MSN redemption payouts.

---

## 5. New database objects summary

| Table | Phase | Purpose |
|---|---|---|
| `rate_limits` | A | Durable rate limiting |
| `sessions` (+ ip, userAgent, lastSeenAt) | A | Session management |
| `platform_settings` | B | Runtime-tunable fees/limits |
| `kyc_requests` | C | Tier upgrade review queue |
| `withdrawals` | D | Real payout lifecycle |
| `price_alerts` | E | Price alert engine |
| `support_tickets`, `ticket_messages` | E | In-app support |
| `admin_audit_log` (+ ip, userAgent) | B | Forensic completeness |

Plus the MSN plan's tables (`p2p_offers`, `p2p_orders`, `p2p_disputes`, MSN
migration artifacts).

## 6. New admin routes summary

```
/admin/transactions      Phase B   platform-wide ledger explorer
/admin/settings          Phase B   fees, limits, referral config
/admin/reports           Phase B   revenue, liabilities, flows
/admin/team              Phase B   admin roles, forced sign-out
/admin/announcements     Phase B   broadcast notifications
/admin/kyc               Phase C   KYC review queue
/admin/withdrawals       Phase D   payout approval queue
/admin/support           Phase E   ticket inbox
/admin/p2p (+ disputes)  MSN plan  escrow oversight
```

## 7. Required integrations (when each phase starts)

- **Phase C:** Vercel Blob (private) — KYC document storage.
- **Phase D:** Payout provider credentials (Billstack payout / Paystack) + webhook.
- **Phase E:** Vercel Cron — price alert checks. Email provider already exists.
- **Optional:** Redis (Upstash) if rate limiting outgrows Postgres.

## 8. Recommended execution order

1. **Phase A** (security) — small, closes real vulnerabilities (email-change
   takeover, ephemeral rate limits).
2. **Phase B** (admin suite) — pure internal software, no external
   dependencies, unblocks config-driven everything.
3. **MSN plan Phases 1–2** (token model + migration) — do this *before* real
   payout rails so Phase D is built MSN-native rather than reworked.
4. **Phase C** (KYC) → **Phase D** (real withdrawals) — compliance before real money out.
5. **MSN plan Phase 3** (P2P escrow) — rides on B, C, D foundations.
6. **Phase E** (quality of life) — continuous, slot in anytime.
