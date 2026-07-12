/**
 * Unified portfolio: native + token balances priced in one pass so the
 * home and send screens share a single CoinGecko call and RPC fan-out.
 * Pure TS (fetch only) - testable in Node.
 */
import { CHAINS } from "./config"
import { TOKENS } from "./tokens"
import { fetchAllBalances, fetchPricesFor, type ChainBalance } from "./balances"
import { fetchAllTokenBalances, type TokenBalance } from "./token-balances"
import type { WalletAddresses } from "../crypto/derivation"

export interface Portfolio {
  native: ChainBalance[]
  tokens: TokenBalance[]
  /** Total fiat value across everything priced, or null if nothing priced. */
  total: number | null
  /** Fiat currency the values are denominated in (lowercase, e.g. "usd"). */
  currency: string
}

/** All CoinGecko ids we need for a full portfolio valuation. */
function allCoingeckoIds(): string[] {
  return [...CHAINS.map((c) => c.coingeckoId), ...TOKENS.map((t) => t.coingeckoId)]
}

export async function fetchPortfolio(
  addresses: WalletAddresses,
  currency = "usd",
): Promise<Portfolio> {
  const prices = await fetchPricesFor(allCoingeckoIds(), currency)
  const [native, tokens] = await Promise.all([
    fetchAllBalances(addresses, prices),
    fetchAllTokenBalances(addresses, prices),
  ])

  let total: number | null = null
  for (const b of [...native, ...tokens]) {
    if (b.usd != null) total = (total ?? 0) + b.usd
  }

  return { native, tokens, total, currency: currency.toLowerCase() }
}
