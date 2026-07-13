# Masanawa Platform Upgrade Plan

## MSN Token Restructure + P2P Escrow System

> Status: PROPOSED — pending approval
> Scope: Full-platform restructure around the MSN platform token, plus a Binance-P2P-style
> escrow marketplace for crypto trading between users.
>
> This document is a technical and product plan. The legal-positioning section describes a
> framing strategy, **not legal advice** — it must be reviewed by qualified Nigerian counsel
> (CBN / SEC Nigeria / ISA 2025 VASP regime) before launch.

---

## Part 1 — The MSN Token Model

### 1.1 What MSN is

- **MSN (Masanawa Token)** is a closed-loop virtual platform token.
- **Peg: 1 MSN = ₦1, fixed.** No floating rate, no market for MSN itself.
- MSN is the **unit of account and settlement for everything inside the platform**:
  buying/selling crypto, P2P escrow payments, sends between users, fees, referral bonuses.
- MSN exists only inside Masanawa. It cannot be transferred off-platform, is not listed
  anywhere, and has no value outside the platform except its redemption right.

### 1.2 What NGN becomes

NGN does **not** disappear — it moves from being the *held balance* to being the
*on-ramp, off-ramp, and display language* of the platform. This preserves the selling
point (users see naira) while removing the legal center of gravity from naira custody.

| Today | After |
|---|---|
| User holds an NGN balance | User holds an MSN balance |
| Bank transfer credits NGN | Bank transfer **purchases MSN** (1:1, instant, automatic) |
| Withdrawal debits NGN → bank payout | Withdrawal **redeems MSN** → NGN paid to user's bank |
| Crypto priced/settled in NGN | Crypto priced in MSN, **displayed with ₦ equivalent** |

### 1.3 The critical UX rule: NGN stays visible everywhere

Because the peg is fixed 1:1, we can show naira prominently without holding naira:

- **Dashboard balance card:** primary figure remains `₦125,000` — with a sub-label
  `125,000 MSN · Masanawa Token`. The big naira number the user loves never goes away.
- **Every amount input:** user types a naira figure; the UI shows `= X MSN` inline.
- **Transaction history:** rows keep showing ₦ values (`ngnValue` column already exists).
- **Receipts/notifications:** "You received 5,000 MSN (₦5,000)".

The mental model we teach: *"Your Masanawa balance is held in MSN. 1 MSN is always worth
₦1. Fund with naira, spend as MSN, withdraw back to naira anytime."*

### 1.4 Legal positioning — "not a bank, but a…"

**Masanawa is a virtual-asset platform whose native utility token (MSN) is the medium of
exchange, with NGN available only as an entry/exit rail.**

Framing pillars (each maps to a concrete product/engineering decision):

1. **"We never hold customer naira balances."**
   NGN received via Billstack virtual accounts is *consideration for the purchase of MSN*,
   converted at the moment of receipt. The webhook credits MSN, not NGN. There is no NGN
   balance row anywhere in the ledger after migration.

2. **"MSN is a closed-loop utility token, not e-money."**
   - Non-transferable off-platform, no external market, no interest/yield paid on it.
   - Redemption (withdrawal) is a *sale of MSN back to the platform* settled in NGN.
   - Terms of Service define MSN as a limited, revocable license/credit — not a deposit.

3. **"P2P trades settle token-for-token."**
   In the escrow marketplace, the buyer pays MSN and the seller delivers crypto. No naira
   moves between users, ever. This is a virtual-asset exchange activity, not a payments
   or remittance activity.

4. **"NGN figures are informational display equivalents."**
   Every ₦ figure in the UI is labelled (footer/disclosure page) as the fixed redemption
   equivalent of MSN, not a statement of a naira account balance.

5. **Positioning language for marketing/legal pages:**
   - We ARE: "a digital-asset wallet and P2P trading platform powered by the Masanawa
     Token (MSN)".
   - We ARE NOT: a bank, a deposit-taker, a money remitter, an e-money issuer, an
     investment scheme. MSN is not an investment and is never marketed as one
     (no "MSN will grow in value" messaging — that would trigger securities analysis).

6. **What still needs counsel review:**
   - Nigeria's ISA 2025 brings virtual-asset service providers under SEC oversight —
     the platform likely still needs VASP registration; MSN framing reduces *banking/
     e-money* exposure, it does not eliminate *VASP* obligations.
   - Redemption rights language (guaranteed 1:1 vs. "at the platform's prevailing rate,
     currently 1:1") — counsel should choose the wording.
   - AML/KYC: existing tier system (tiers 1–3) stays and gates MSN purchase/redemption
     limits exactly as it gates funding/withdrawal today.

### 1.5 Required legal/content changes (pages already exist)

- `app/terms/page.tsx` — add MSN Token Terms: definition, 1:1 redemption policy,
  closed-loop restrictions, escrow rules, dispute policy.
- `app/disclosures/page.tsx` — add "What is MSN?" disclosure, ₦-display-equivalence
  notice, "Masanawa is not a bank; balances are not insured deposits" statement.
- `app/privacy/page.tsx` — extend for P2P counterparty data sharing during disputes.
- New `app/help` articles: "What is MSN?", "How escrow protects your trade".

---

## Part 2 — Technical Restructure for MSN

### 2.1 Asset model (`lib/wallet/assets.ts`)

```ts
export type AssetSymbol = 'MSN' | 'USDT' | 'USDC' | 'BTC' | 'ETH' | 'SOL'
// NGN is removed as a *held* asset. A separate DisplayCurrency concept renders ₦.
```

- `ASSETS`: replace the NGN row with `{ symbol: 'MSN', name: 'Masanawa Token', glyph: '₦', decimals: 2 }`
  — note: glyph strategy decided in UI section (2.5); MSN amounts render with a token
  mark, the ₦ equivalent renders beside them.
- `FALLBACK_NGN_RATES` → `MSN: 1` (rates remain "NGN per unit" since MSN=NGN 1:1; the
  field is renamed conceptually to "MSN rate" — one rename, zero math changes).
- `formatMsn()` added alongside `formatNgn()`; both used together in UI.

**Why this is cheap:** because of the 1:1 peg, every existing `ngnValue`, fee, tier
limit, and price calculation keeps working unchanged. The restructure is a *relabel of
the base asset*, not a re-derivation of the math.

### 2.2 Ledger (`lib/wallet/ledger.ts`)

- `ZERO_BALANCES`: `NGN: 0` → `MSN: 0`.
- Balance rules unchanged; `buy`/`sell` debit/credit **MSN** instead of NGN.
- New transaction types added to `TxType`:

| Type | Effect | Purpose |
|---|---|---|
| `fund` | `MSN += amount` | NGN received via Billstack → MSN minted to user 1:1 |
| `withdraw` | `MSN -= amount` (incl. fee) | MSN redeemed → NGN bank payout |
| `escrow_lock` | `asset -= amount` (crypto) or `MSN -= amount` | Move funds into escrow (out of spendable balance) |
| `escrow_release` | `asset += amount` | Escrow pays out to trade counterparty |
| `escrow_refund` | `asset += amount` | Escrow returns to original owner (cancel/dispute) |
| `convert` | `MSN += amount` | One-time migration credit (see Part 4) |

- `dailyOutflowNgn()` keeps working as-is (values are already ₦-denominated and MSN is 1:1).

### 2.3 Database (`lib/db/schema.ts` + new migration)

- `transactions.asset` comment updated: `MSN | USDT | USDC | BTC | ETH | SOL`.
- `transactions.type` gains the new escrow/convert types (text column — no DDL needed).
- `ngnValue` column **stays** (it is the display/audit value and the peg makes it exact).
- New tables (Part 3 details): `p2p_offers`, `p2p_orders`, `p2p_disputes`,
  `p2p_order_messages`, `escrow_holds`.

### 2.4 Money flows

**Funding (NGN → MSN):**
`app/api/webhooks/billstack/route.ts` → on verified payment, write a `fund` transaction
with `asset: 'MSN'`, `amount: ngnReceived` (1:1). Notification copy: *"₦X received —
X MSN added to your wallet."* Fundings idempotency table unchanged.

**Withdrawal (MSN → NGN):**
Withdraw flow debits MSN (`withdraw`, `asset: 'MSN'`), fee stays `FEES.withdrawNgn = 50`
(= 50 MSN). Payout instruction to bank rails unchanged. Copy: *"You redeemed X MSN —
₦X is on the way to your GTBank account."*

**Buy/Sell crypto:** identical mechanics, MSN replaces NGN as the settlement leg.

**Sends:** wallet-to-wallet sends of MSN and crypto unchanged.

**Referrals:** `bonusNgn` becomes an MSN bonus (same 1:1 number); referral withdrawal
credits MSN.

### 2.5 UI treatment (the "NGN stays visible" contract)

- **Balance card:** `₦125,000` large; `125,000 MSN` small beneath with an MSN token badge.
  A subtle info icon opens a "What is MSN?" sheet.
- **Asset list:** MSN appears as the first asset row (like NGN today), naira-equivalent
  shown for every asset exactly as now.
- **Inputs:** all amount inputs remain naira-first (`₦` prefix); a live `= X MSN` line
  sits under the field. Since 1:1, this is purely educational.
- **Tx history and receipts:** unchanged visually, plus MSN labels.
- Design tokens: introduce one MSN brand accent for the token badge; no palette expansion
  beyond the existing 3–5 colors.

---

## Part 3 — P2P Escrow System (Binance-P2P style)

### 3.1 Model overview

Users trade **crypto ↔ MSN** with each other. The platform never takes market risk; it
custodies the escrowed asset and arbitrates disputes.

- A **maker** posts an offer: *"Selling up to 500 USDT at 1,590 MSN/USDT, min 50 / max 500
  per order."* (Buy offers are the mirror image.)
- A **taker** opens an order against the offer.
- The **escrow engine** locks the seller's crypto the moment an order opens.
- The buyer pays MSN **in-platform** (single tap — this is a huge advantage over
  Binance-style fiat bank transfers: payment is instant, internal, and provable).
- Escrow releases crypto to the buyer atomically with the MSN payment.
- If anything goes wrong: cancel (auto-refund) or dispute (admin resolves).

Because both legs are internal balances, **the entire order can settle atomically in one
DB transaction** — we get to skip the whole "buyer claims they paid, seller must confirm"
trust gap that plagues fiat P2P. Disputes become rare edge cases (mispriced offers,
fraud/coercion claims) rather than the core flow.

### 3.2 Two settlement modes (design decision)

| Mode | Flow | When |
|---|---|---|
| **Instant (default)** | Taker's tap simultaneously: debits buyer MSN, debits escrowed crypto, credits both sides. Atomic. | Both legs internal — the normal case |
| **Manual-confirm (escrow window)** | Order opens → seller's crypto locked → buyer has T minutes to pay MSN → seller auto-notified → release. Timeouts auto-cancel. | Kept in the engine for future off-platform payment legs; also used when buyer's MSN is insufficient at order time |

Ship **Instant** as the launch behavior; build the state machine so Manual-confirm is a
configuration, not a rewrite.

### 3.3 Order state machine

```
OPEN ──payment──▶ PAID ──release──▶ COMPLETED
  │                 │
  │ timeout/cancel  │ dispute
  ▼                 ▼
CANCELLED       DISPUTED ──admin──▶ COMPLETED (release to buyer)
 (refund)                    └────▶ CANCELLED (refund to seller)
```

All transitions append ledger rows (`escrow_lock` / `escrow_release` / `escrow_refund`)
— balances remain fully derived from transactions, preserving the existing architecture.

### 3.4 New schema

```
p2p_offers
  id, makerId, side ('buy'|'sell'), asset, priceMsn (per unit),
  totalAmount, remainingAmount, minOrderMsn, maxOrderMsn,
  terms (text), status ('active'|'paused'|'closed'), createdAt

p2p_orders
  id, offerId, makerId, takerId, asset, amount, priceMsn, totalMsn,
  feeMsn, status ('open'|'paid'|'completed'|'cancelled'|'disputed'),
  escrowHoldId, expiresAt, completedAt, createdAt

escrow_holds
  id, orderId, ownerId, asset, amount,
  status ('held'|'released'|'refunded'), createdAt, resolvedAt

p2p_order_messages          -- in-order chat, required for disputes
  id, orderId, senderId, body, createdAt

p2p_disputes
  id, orderId, openedById, reason, evidence (text/JSON),
  status ('open'|'resolved_release'|'resolved_refund'),
  resolvedById, resolutionNote, resolvedAt, createdAt
```

### 3.5 Escrow engine rules (server-only, `lib/p2p/`)

1. **Lock-before-list:** a sell offer's crypto is *reserved* against spendable balance at
   offer time (spendable = derived balance − active offer reservations); it is hard-locked
   (`escrow_lock` tx) per-order when a taker opens an order.
2. **Atomic settlement:** payment + release happen in a single DB transaction; no state
   where MSN has left the buyer but crypto hasn't left escrow.
3. **Fees:** taker fee in MSN (reuse `tradeFeeNgn` model: 1%, min 100 MSN), maker fee 0
   at launch. Fee is a platform ledger entry — auditable.
4. **Timeouts:** `open` orders auto-cancel after 15 min (config), releasing the hold.
5. **Limits & trust:** tier system gates max order size (reuse `lib/wallet/tiers.ts`);
   frozen users cannot make/take offers; PIN required to confirm an order (reuse pin flow).
6. **Disputes:** either party can dispute a `paid`/`open` order; funds stay locked;
   admin resolves via new console screens; every resolution writes to `admin_audit_log`.
7. **Rate limiting:** reuse `lib/auth/rate-limit.ts` for offer/order creation.

### 3.6 New routes

**User (dashboard):**
- `app/dashboard/p2p/page.tsx` — marketplace: buy/sell tabs, asset filter, offer list.
- `app/dashboard/p2p/offers/new/page.tsx` — post an offer.
- `app/dashboard/p2p/offers/page.tsx` — my offers (pause/close/edit).
- `app/dashboard/p2p/orders/[id]/page.tsx` — order room: status timeline, chat,
  pay/release/cancel/dispute actions.
- `app/dashboard/p2p/orders/page.tsx` — my order history.

**Admin:**
- `app/admin/p2p/page.tsx` — live orders/offers overview, volume stats.
- `app/admin/p2p/disputes/[id]/page.tsx` — dispute room: both sides' evidence, chat log,
  ledger view, resolve buttons (release / refund) with mandatory note.

### 3.7 Notifications

Reuse the existing `notifications` table for every order event: order opened, payment
received, escrow released, order cancelled, dispute opened/resolved.

---

## Part 4 — Migration Plan (NGN balances → MSN)

Existing ledgers derive balances from transactions, so migration must preserve history
while flipping the base asset. One-shot, idempotent migration script (`scripts/migrate-msn.ts`):

1. **Freeze window:** put the app in a short maintenance mode (env flag) — minutes, not hours.
2. **Snapshot:** for every user, compute current NGN balance via `computeBalances`.
3. **Convert:** write one `convert` transaction per user:
   `{ type: 'convert', asset: 'MSN', amount: ngnBalance, ngnValue: ngnBalance, note: 'NGN → MSN migration (1:1)' }`.
4. **Retire NGN rows from balance math:** ledger's `computeBalances` ignores `asset: 'NGN'`
   rows for balance purposes (historical rows are kept verbatim for the activity screen —
   they still render correctly since amounts and ₦ values are unchanged).
5. **Verify:** assert per-user invariant `MSN_after === NGN_before`; log a
   migration report row in `admin_audit_log` per user.
6. **Notify:** one notification per user: *"Your naira balance is now held as MSN
   (1 MSN = ₦1). Nothing about your money changed — ₦X is still ₦X."*
7. **Rollback story:** the `convert` rows are tagged; a reverse script can void them and
   restore NGN-based balance derivation if launch is aborted.

Old transaction history remains browsable and accurate — this is an additive migration,
no destructive updates.

---

## Part 5 — Delivery Phases

| Phase | Deliverable | Contents |
|---|---|---|
| **1** | MSN core | Asset model swap, ledger types, funding webhook → MSN, withdrawal = redemption, all UI relabels (₦-first display preserved), terms/disclosures copy |
| **2** | Migration | Migration script, maintenance flag, verification report, user notifications |
| **3** | Escrow engine | Schema (5 tables), `lib/p2p/` engine with atomic settlement, state machine, fees, timeouts, tier limits |
| **4** | P2P marketplace UI | Marketplace, offer management, order room with chat, my orders |
| **5** | Disputes + admin | Dispute flow, admin P2P console, audit logging, resolution actions |
| **6** | Legal & education | Terms/disclosures final copy, "What is MSN?" help content, in-app education sheet, marketing page updates |

Each phase is independently shippable; Phases 1–2 must land together in one release.

---

## Part 6 — Open Decisions

1. **MSN redemption wording** in Terms (guaranteed 1:1 vs. platform-set-currently-1:1) — needs counsel.
2. **Manual-confirm escrow mode** exposure at launch (recommend: engine supports it, UI ships Instant only).
3. **Maker fees** — 0 at launch, revisit with volume.
4. **Offer price bounds** — clamp offer prices to ±X% of live market rate (`lib/wallet/prices.ts`) to prevent predatory offers against novice users. Recommend ±5%.
5. **MSN glyph/badge design** — token mark vs. text badge.
