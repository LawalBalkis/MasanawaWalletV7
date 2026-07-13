# Masanawa Wallet — Project Status

Last updated: 2026-07-13 (branch `email-otp-verification`)

This document is the single source of truth for **what is real vs. what is
missing**. It is kept accurate so any future work knows exactly where to pick
up. Update it whenever a gap is closed.

---

## 1. Architecture (how the platform is built)

- **Persistence boundary:** `lib/wallet/store.ts` defines one `WalletStore`
  interface with two interchangeable backends:
  - `InMemoryWalletStore` — default, seeded demo data, zero setup.
  - `DrizzleWalletStore` — used automatically when `DATABASE_URL` is set.
  - Schema: `lib/db/schema.ts`. Migrations generated with `pnpm db:generate`,
    applied with `pnpm db:migrate`. **DB connection is intentionally deferred —
    build against the in-memory store; the Drizzle store must stay in lockstep.**
- **Balances are always derived** from ledger rows (`lib/wallet/ledger.ts`).
  There is no balances table to drift out of sync.
- **Prices** are live from CoinGecko with a static fallback (`lib/wallet/prices.ts`).
- **Auth** is custom (scrypt + SHA-256 session cookies), not Better Auth.

> Rule for every change: update BOTH store backends and, if the schema changes,
> regenerate the Drizzle migration.

---

## 2. Implemented and working (audited ✅)

### Authentication & session
- Sign-up, sign-in, sign-out — real, DB-backed (`lib/auth/actions.ts`).
- Email OTP verification (`/auth/verify`) — wired to `verifyEmailAction` + resend.
- Password reset (`/auth/forgot-password` → `/auth/reset-password`) — wired.
- Transaction PIN: set + server-side verify (scrypt). Change PIN in Settings.
- Sessions: httpOnly cookie, SHA-256 hashed token, DB-backed, expiry enforced.
- Rate limiting on auth entry points (`lib/auth/rate-limit.ts`).

### Wallet core
- Virtual account creation via Billstack (NIN/BVN KYC capture at funding time),
  deterministic per-user reference, recovered never duplicated.
- Billstack webhook: HMAC-verified, idempotent, atomic funding + ledger credit.
- Dashboard: real balances (ledger-derived), asset list, holdings valuation.
- Send by @username, buy/sell crypto, bank withdrawal, crypto withdrawal —
  all real server actions with PIN verification + tier-limit enforcement
  (incl. daily aggregate limits).
- Activity list + transaction detail. Receive page.

### Account settings
- Profile (name/email/phone), notification prefs, security toggles,
  beneficiaries add/remove, change PIN — all persist via `account-actions.ts`.

---

## 3. Missing implementations — the work plan

Ordered. Work top-to-bottom; check items off as they land.

### Phase 1 — Foundation: schema & store for admin + KYC  ⬜
- [ ] Add `role` ('user' | 'admin') and `status` ('active' | 'frozen') columns
      to `users` (schema + `UserRecord` + `UserPatch` + both store backends +
      seed a demo admin).
- [ ] New `adminAuditLog` table (actor, action, targetUserId, detail JSON, ts).
- [ ] Extend `WalletStore` with admin/query methods:
      `listUsers`, `countUsers`, `listAllTransactions`, `listAllFundings`,
      `getPlatformStats`, `addAuditLog`, `listAuditLog`. Implement in BOTH
      backends.
- [ ] Regenerate Drizzle migration.

### Phase 2 — KYC tier upgrade (data capture + auto-approve)  ⬜
- [ ] `submitTierUpgradeAction`: captures `kycAddress` (Tier 2) and
      `kycIdType`/`kycIdNumber` (Tier 3), validates, persists, bumps `tier`
      immediately (auto-approve per product decision).
- [ ] Replace the stubbed "Upgrade" button in Settings with a real dialog/form
      per target tier; show requirements and confirmation.
- [ ] Enforce max-balance tier rules already defined in `lib/wallet/tiers.ts`.

### Phase 3 — Admin area shell + gating + overview  ⬜
- [ ] `requireAdmin()` session guard; `/admin` route group + layout + nav.
- [ ] Redirect non-admins; hide admin nav from normal users.
- [ ] Admin dashboard: platform metrics (users, total balances, volume,
      fundings today, pending items).

### Phase 4 — Admin user management  ⬜
- [ ] Users table with search/filter + pagination.
- [ ] User detail: balances, tier, KYC data, transactions, fundings.
- [ ] Actions (all audit-logged): freeze/unfreeze, adjust tier, reset PIN,
      resend/force email verification.
- [ ] Frozen users are blocked from money-movement actions.

### Phase 5 — Funding oversight & manual adjustments (disputes)  ⬜
- [ ] View/filter all transactions and fundings across the platform.
- [ ] Manual credit/debit (funding dispute resolution) — writes a ledger row,
      is fully audit-logged, and requires a reason. Reversible via an
      offsetting entry.
- [ ] KYC review view (read-only, since upgrades auto-approve) + audit log view.

### Phase 6 — Hardening / minor  ⬜
- [ ] Email change requires re-verification.
- [ ] Real 2FA (TOTP enrollment) — currently a cosmetic toggle.
- [ ] Biometric toggle is cosmetic (client capability only).
- [ ] Active-session / device management + remote sign-out.
- [ ] Notification generation on money movement (schema exists; verify coverage).
- [ ] Account deactivation / closure (self-service).

### Deferred (explicit product decisions)
- **Database connection** — deferred until the app logic is complete; the
  in-memory store is the working backend for now.
- **Bank account name resolution** — currently best-effort; a real
  name-enquiry API can replace it.
- **Per-user on-chain deposit addresses** — require a custody/chain integration.

---

## 4. Verification tiers

Defined in `lib/wallet/tiers.ts` — the single source of truth for limits,
shown in **Settings → Verification tier** and enforced on money-movement flows.

| | Tier 1 — Verified | Tier 2 — Enhanced | Tier 3 — Full |
| --- | --- | --- | --- |
| Requirement | NIN or BVN | + address verification | + ID document data |
| Per withdrawal | ₦100,000 | ₦1,000,000 | No limit |
| Daily bank withdrawals | ₦300,000 | ₦5,000,000 | No limit |
| Daily crypto withdrawals | ₦300,000 | ₦5,000,000 | No limit |
| Max balance | ₦1,000,000 | ₦10,000,000 | No limit |
| Crypto withdrawals | ✅ Allowed | ✅ Allowed | ✅ Allowed |

---

## 5. Required manual setup (production)

### Billstack webhook URL
1. Billstack dashboard → **Developer → Webhooks**.
2. Set URL to `https://<your-production-domain>/api/webhooks/billstack`.
3. Requests are HMAC-verified against `BILLSTACK_SECRET_KEY` (must match the
   dashboard key).

| Variable | Status | Purpose |
| --- | --- | --- |
| `BILLSTACK_SECRET_KEY` | ✅ set | Create/fetch virtual accounts, verify webhooks |
| `RESEND_API_KEY` | ⬜ needed for real emails | OTP / password-reset delivery |
| `DATABASE_URL` | ⬜ deferred | Switches to Postgres backend |
