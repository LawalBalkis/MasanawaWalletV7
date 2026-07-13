// ---------------------------------------------------------------------------
// Live NGN market rates (server-only), with a static fallback so the app
// never breaks when the price feed is unreachable.
// Source: CoinGecko public API, cached for 5 minutes via Next fetch cache.
// ---------------------------------------------------------------------------
import 'server-only'

import { FALLBACK_NGN_RATES, type AssetSymbol } from './assets'

const COINGECKO_IDS: Record<Exclude<AssetSymbol, 'NGN'>, string> = {
  USDT: 'tether',
  USDC: 'usd-coin',
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
}

export async function getNgnRates(): Promise<Record<AssetSymbol, number>> {
  try {
    const ids = Object.values(COINGECKO_IDS).join(',')
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=ngn`,
      { next: { revalidate: 300 } },
    )
    if (!res.ok) throw new Error(`CoinGecko responded ${res.status}`)
    const data = (await res.json()) as Record<string, { ngn?: number }>
    const rates: Record<AssetSymbol, number> = { ...FALLBACK_NGN_RATES }
    for (const [symbol, id] of Object.entries(COINGECKO_IDS) as [
      Exclude<AssetSymbol, 'NGN'>,
      string,
    ][]) {
      const ngn = data[id]?.ngn
      if (typeof ngn === 'number' && ngn > 0) rates[symbol] = ngn
    }
    return rates
  } catch {
    // Price feed unavailable — fall back to static rates so flows keep working.
    return { ...FALLBACK_NGN_RATES }
  }
}
