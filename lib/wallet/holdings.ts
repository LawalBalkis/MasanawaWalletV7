// ---------------------------------------------------------------------------
// Server helper: combine asset metadata + live NGN rates + the user's
// ledger-derived balances into the AssetHolding[] shape client flows consume.
// ---------------------------------------------------------------------------
import 'server-only'

import { ASSETS, type AssetHolding } from './assets'
import { getNgnRates } from './prices'
import { walletStore } from './store'

export async function getHoldings(userId: string): Promise<AssetHolding[]> {
  const [balances, rates] = await Promise.all([
    walletStore.getBalances(userId),
    getNgnRates(),
  ])
  return ASSETS.map((meta) => ({
    ...meta,
    balance: balances[meta.symbol],
    ngnRate: rates[meta.symbol],
  }))
}

export function totalNgnValue(holdings: AssetHolding[]): number {
  return holdings.reduce((sum, h) => sum + h.balance * h.ngnRate, 0)
}
