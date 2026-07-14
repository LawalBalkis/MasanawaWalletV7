// ---------------------------------------------------------------------------
// Ledger rules — every balance in the app is DERIVED from transaction rows.
// Shared by both WalletStore backends (in-memory and Drizzle/Postgres) so the
// two can never disagree.
//
// MSN (Masanawa Token) is the base settlement asset (1 MSN = ₦1 fixed).
// NGN is no longer a held asset — it is the on-ramp/off-ramp and display currency.
//
// Per-transaction balance effects:
//   fund     (MSN)      MSN   += amount                    (amount > 0)
//   withdraw (MSN)      MSN   += amount                    (amount < 0, incl. fee)
//   withdraw (crypto)   asset += amount                    (amount < 0)
//   buy      (crypto)   asset += amount; MSN -= ngnValue   (ngnValue = cost incl. fee)
//   sell     (crypto)   asset += amount; MSN += ngnValue   (ngnValue = net proceeds)
//   send                asset += amount                    (amount < 0)
//   receive            asset += amount                    (amount > 0)
//   escrow_lock        asset -= amount                    (moved to escrow)
//   escrow_release     asset += amount                    (paid to counterparty)
//   escrow_refund      asset += amount                    (returned to owner)
//   convert            MSN  += amount                      (one-time NGN→MSN migration)
// ---------------------------------------------------------------------------
import type { AssetSymbol, TxType, WalletTx } from './assets'

export type Balances = Record<AssetSymbol, number>

export const ZERO_BALANCES: Balances = {
  MSN: 0,
  USDT: 0,
  USDC: 0,
  BTC: 0,
  ETH: 0,
  SOL: 0,
}

export function computeBalances(txs: WalletTx[]): Balances {
  const b: Balances = { ...ZERO_BALANCES }
  for (const tx of txs) {
    if (tx.status !== 'completed') continue
    // Historical NGN rows are kept verbatim but no longer affect balances.
    if ((tx.asset as string) === 'NGN') continue
    b[tx.asset] += tx.amount
    if (tx.type === 'buy' && tx.asset !== 'MSN') b.MSN -= tx.ngnValue
    if (tx.type === 'sell' && tx.asset !== 'MSN') b.MSN += tx.ngnValue
  }
  // Guard against floating point dust.
  for (const key of Object.keys(b) as AssetSymbol[]) {
    b[key] = Math.round(b[key] * 1e10) / 1e10
  }
  return b
}

/** Sum of NGN value moved out today for the given tx types (daily-limit checks). */
export function dailyOutflowNgn(
  txs: WalletTx[],
  types: TxType[],
  opts?: { cryptoOnly?: boolean; msnOnly?: boolean; now?: Date },
): number {
  const now = opts?.now ?? new Date()
  const dayStart = new Date(now)
  dayStart.setHours(0, 0, 0, 0)
  return txs
    .filter((tx) => {
      if (!types.includes(tx.type)) return false
      if (tx.amount >= 0) return false
      if (opts?.cryptoOnly && (tx.asset === 'MSN' || (tx.asset as string) === 'NGN')) return false
      if (opts?.msnOnly && tx.asset !== 'MSN' && (tx.asset as string) !== 'NGN') return false
      return new Date(tx.date) >= dayStart
    })
    .reduce((sum, tx) => sum + Math.abs(tx.ngnValue), 0)
}
