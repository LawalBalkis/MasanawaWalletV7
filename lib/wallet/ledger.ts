// ---------------------------------------------------------------------------
// Ledger rules — every balance in the app is DERIVED from transaction rows.
// Shared by both WalletStore backends (in-memory and Drizzle/Postgres) so the
// two can never disagree.
//
// Per-transaction balance effects:
//   fund     (NGN)     NGN   += amount                    (amount > 0)
//   withdraw (NGN)     NGN   += amount                    (amount < 0, incl. fee)
//   withdraw (crypto)  asset += amount                    (amount < 0)
//   buy      (crypto)  asset += amount; NGN -= ngnValue   (ngnValue = cost incl. fee)
//   sell     (crypto)  asset += amount; NGN += ngnValue   (ngnValue = net proceeds)
//   send               asset += amount                    (amount < 0)
//   receive            asset += amount                    (amount > 0)
// ---------------------------------------------------------------------------
import type { AssetSymbol, TxType, WalletTx } from './assets'

export type Balances = Record<AssetSymbol, number>

export const ZERO_BALANCES: Balances = {
  NGN: 0,
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
    b[tx.asset] += tx.amount
    if (tx.type === 'buy' && tx.asset !== 'NGN') b.NGN -= tx.ngnValue
    if (tx.type === 'sell' && tx.asset !== 'NGN') b.NGN += tx.ngnValue
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
  opts?: { cryptoOnly?: boolean; ngnOnly?: boolean; now?: Date },
): number {
  const now = opts?.now ?? new Date()
  const dayStart = new Date(now)
  dayStart.setHours(0, 0, 0, 0)
  return txs
    .filter((tx) => {
      if (!types.includes(tx.type)) return false
      if (tx.amount >= 0) return false
      if (opts?.cryptoOnly && tx.asset === 'NGN') return false
      if (opts?.ngnOnly && tx.asset !== 'NGN') return false
      return new Date(tx.date) >= dayStart
    })
    .reduce((sum, tx) => sum + Math.abs(tx.ngnValue), 0)
}
