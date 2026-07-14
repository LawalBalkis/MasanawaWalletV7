// ---------------------------------------------------------------------------
// Client-safe wallet domain: asset metadata, transaction shapes, fees and
// formatting helpers. No balances live here — balances are derived from the
// ledger (lib/wallet/ledger.ts) via the WalletStore.
//
// MSN (Masanawa Token) is the closed-loop platform token: 1 MSN = ₦1 fixed.
// NGN is no longer a *held* asset — it is the on-ramp/off-ramp and display
// currency. Every ₦ figure in the UI is the fixed redemption equivalent of MSN.
// ---------------------------------------------------------------------------

export type AssetSymbol = 'MSN' | 'USDT' | 'USDC' | 'BTC' | 'ETH' | 'SOL'

export interface AssetMeta {
  symbol: AssetSymbol
  name: string
  glyph: string
  decimals: number
}

/** Asset metadata + the user's balance + the current NGN rate. */
export interface AssetHolding extends AssetMeta {
  /** Balance in the asset's own unit. */
  balance: number
  /** NGN per 1 unit of the asset. For MSN this is always 1. */
  ngnRate: number
}

export type TxType =
  | 'fund'
  | 'buy'
  | 'sell'
  | 'send'
  | 'receive'
  | 'withdraw'
  | 'escrow_lock'
  | 'escrow_release'
  | 'escrow_refund'
  | 'convert'

export interface WalletTx {
  id: string
  type: TxType
  asset: AssetSymbol
  /** Amount in the asset's own unit. Positive = in, negative = out. */
  amount: number
  /** NGN value at time of transaction. */
  ngnValue: number
  feeNgn?: number
  counterparty?: string
  note?: string
  status: 'completed' | 'pending'
  date: string
}

export interface Beneficiary {
  id: string
  bank: string
  accountNumber: string
  accountName: string
}

export interface WalletNotification {
  id: string
  title: string
  body: string
  date: string
  read: boolean
  txId?: string
}

export const ASSETS: AssetMeta[] = [
  { symbol: 'MSN', name: 'Masanawa Token', glyph: '₦', decimals: 2 },
  { symbol: 'USDT', name: 'Tether', glyph: 'T', decimals: 2 },
  { symbol: 'USDC', name: 'USD Coin', glyph: '$', decimals: 2 },
  { symbol: 'BTC', name: 'Bitcoin', glyph: 'B', decimals: 8 },
  { symbol: 'ETH', name: 'Ethereum', glyph: 'E', decimals: 6 },
  { symbol: 'SOL', name: 'Solana', glyph: 'S', decimals: 4 },
]

export function assetMeta(symbol: AssetSymbol): AssetMeta {
  const found = ASSETS.find((a) => a.symbol === symbol)
  if (!found) throw new Error(`Unknown asset: ${symbol}`)
  return found
}

/**
 * Static NGN rates used when the live market-data fetch is unavailable.
 * Live rates come from lib/wallet/prices.ts (server).
 * MSN is always 1:1 with NGN.
 */
export const FALLBACK_NGN_RATES: Record<AssetSymbol, number> = {
  MSN: 1,
  USDT: 1585,
  USDC: 1582,
  BTC: 168_400_000,
  ETH: 5_620_000,
  SOL: 234_000,
}

/** Fee model shown at review time. Wallet-to-wallet sends are free. */
export const FEES = {
  send: 0,
  /** 1% trade fee, min ₦100 */
  tradeRate: 0.01,
  tradeMinNgn: 100,
  /** Flat NGN bank withdrawal fee (= 50 MSN) */
  withdrawNgn: 50,
}

export function tradeFeeNgn(ngnAmount: number): number {
  return Math.max(ngnAmount * FEES.tradeRate, FEES.tradeMinNgn)
}

export const NIGERIAN_BANKS = [
  'Access Bank',
  'First Bank',
  'GTBank',
  'Kuda',
  'Moniepoint',
  'Opay',
  'UBA',
  'Wema Bank',
  'Zenith Bank',
]

/**
 * Demo crypto deposit addresses per asset.
 * SWAP POINT: real per-user deposit addresses require a custody/chain integration.
 */
export const DEPOSIT_ADDRESSES: Partial<Record<AssetSymbol, { address: string; network: string }>> = {
  USDT: { address: 'TXk4mQ9pW2vE8rN3yLcA7bZjD5sF6hG1uK', network: 'Tron (TRC-20)' },
  USDC: { address: '0x8f3Ca1b92Dd47e6A50cB1fE29a04D8b7C6e5F2a1', network: 'Ethereum (ERC-20)' },
  BTC: { address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', network: 'Bitcoin' },
  ETH: { address: '0x8f3Ca1b92Dd47e6A50cB1fE29a04D8b7C6e5F2a1', network: 'Ethereum' },
  SOL: { address: '7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsSKCT38X', network: 'Solana' },
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** Format a naira amount (the display equivalent of MSN). */
export function formatNgn(value: number): string {
  return `₦${value.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`
}

/** Format an MSN amount with the token label. */
export function formatMsn(value: number): string {
  return `${value.toLocaleString('en-NG', { maximumFractionDigits: 0 })} MSN`
}

/** Format any asset amount with its symbol. MSN renders as ₦ (naira display). */
export function formatAsset(amount: number, asset: Pick<AssetMeta, 'symbol' | 'decimals'>): string {
  const abs = Math.abs(amount)
  const str = abs.toLocaleString('en-NG', { maximumFractionDigits: asset.decimals })
  return asset.symbol === 'MSN' ? `₦${str}` : `${str} ${asset.symbol}`
}

// ---------------------------------------------------------------------------
// Price history (deterministic pseudo-random walk anchored at today's rate).
// SWAP POINT: replace with a real OHLC market-data feed when available.
// ---------------------------------------------------------------------------

export type ChartRange = '1W' | '1M' | '1Y'

export function priceHistory(
  symbol: AssetSymbol,
  range: ChartRange,
  currentRate: number = FALLBACK_NGN_RATES[symbol],
): { date: string; price: number }[] {
  const points = range === '1W' ? 7 : range === '1M' ? 30 : 52
  const stepDays = range === '1Y' ? 7 : 1
  const volatility = symbol === 'MSN' ? 0 : symbol === 'USDT' || symbol === 'USDC' ? 0.004 : 0.035
  const seedBase = symbol.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  const now = Date.now()
  const out: { date: string; price: number }[] = []
  let price = currentRate
  const deltas: number[] = []
  for (let i = 0; i < points - 1; i++) {
    const r = Math.sin(seedBase * 13.37 + i * 7.77 + points) * 0.5 + Math.sin(seedBase + i * 2.1) * 0.5
    deltas.push(r * volatility)
  }
  const prices = [price]
  for (let i = deltas.length - 1; i >= 0; i--) {
    price = price / (1 + deltas[i])
    prices.unshift(price)
  }
  for (let i = 0; i < points; i++) {
    const t = now - (points - 1 - i) * stepDays * 86400000
    out.push({ date: new Date(t).toISOString(), price: Math.round(prices[i] * 100) / 100 })
  }
  return out
}
