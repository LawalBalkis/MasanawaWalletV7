// Demo data layer for the Masanawa web app UI.
// NOTE: This will be replaced by real database queries (Neon + Drizzle)
// in the final wiring step. Keep shapes stable — components depend on them.

export type AssetSymbol = 'NGN' | 'USDT' | 'USDC' | 'BTC' | 'ETH' | 'SOL'

export interface WalletAsset {
  symbol: AssetSymbol
  name: string
  glyph: string
  /** Balance in the asset's own unit */
  balance: number
  /** NGN per 1 unit of the asset */
  ngnRate: number
  decimals: number
}

export type TxType = 'fund' | 'buy' | 'sell' | 'send' | 'receive' | 'withdraw'

export interface WalletTx {
  id: string
  type: TxType
  asset: AssetSymbol
  /** Amount in the asset's own unit. Positive = in, negative = out. */
  amount: number
  /** NGN value at time of transaction */
  ngnValue: number
  counterparty?: string
  note?: string
  status: 'completed' | 'pending'
  date: string
}

export const DEMO_USER = {
  name: 'Adaeze Okafor',
  username: 'adaeze',
  virtualAccount: {
    bank: 'Wema Bank',
    accountNumber: '7834 5621 09',
    accountName: 'Masanawa / Adaeze Okafor',
  },
}

export const WALLET_ASSETS: WalletAsset[] = [
  { symbol: 'NGN', name: 'Nigerian Naira', glyph: '₦', balance: 486250, ngnRate: 1, decimals: 2 },
  { symbol: 'USDT', name: 'Tether', glyph: '₮', balance: 342.18, ngnRate: 1585, decimals: 2 },
  { symbol: 'USDC', name: 'USD Coin', glyph: '$', balance: 120.5, ngnRate: 1582, decimals: 2 },
  { symbol: 'BTC', name: 'Bitcoin', glyph: '₿', balance: 0.0042, ngnRate: 168400000, decimals: 8 },
  { symbol: 'ETH', name: 'Ethereum', glyph: 'Ξ', balance: 0.085, ngnRate: 5620000, decimals: 6 },
  { symbol: 'SOL', name: 'Solana', glyph: 'S', balance: 3.4, ngnRate: 234000, decimals: 4 },
]

export const RECENT_TRANSACTIONS: WalletTx[] = [
  { id: 'tx_01', type: 'receive', asset: 'USDT', amount: 50, ngnValue: 79250, counterparty: '@chinedu', note: 'Freelance payment', status: 'completed', date: '2026-07-12T14:32:00Z' },
  { id: 'tx_02', type: 'fund', asset: 'NGN', amount: 200000, ngnValue: 200000, note: 'Bank transfer', status: 'completed', date: '2026-07-11T09:15:00Z' },
  { id: 'tx_03', type: 'buy', asset: 'BTC', amount: 0.0012, ngnValue: 202080, note: 'Bought with NGN', status: 'completed', date: '2026-07-10T18:47:00Z' },
  { id: 'tx_04', type: 'send', asset: 'USDT', amount: -25, ngnValue: 39625, counterparty: '@femi', note: 'Dinner split', status: 'completed', date: '2026-07-09T20:03:00Z' },
  { id: 'tx_05', type: 'withdraw', asset: 'NGN', amount: -150000, ngnValue: 150000, note: 'GTBank ••4521', status: 'completed', date: '2026-07-08T11:26:00Z' },
  { id: 'tx_06', type: 'sell', asset: 'ETH', amount: -0.02, ngnValue: 112400, note: 'Sold to NGN', status: 'completed', date: '2026-07-06T16:58:00Z' },
]

export function assetBySymbol(symbol: AssetSymbol): WalletAsset {
  const found = WALLET_ASSETS.find((a) => a.symbol === symbol)
  if (!found) throw new Error(`Unknown asset: ${symbol}`)
  return found
}

export function totalNgnValue(assets: WalletAsset[] = WALLET_ASSETS): number {
  return assets.reduce((sum, a) => sum + a.balance * a.ngnRate, 0)
}

export function formatNgn(value: number): string {
  return `₦${value.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`
}

export function formatAsset(amount: number, asset: WalletAsset): string {
  const abs = Math.abs(amount)
  const str = abs.toLocaleString('en-NG', { maximumFractionDigits: asset.decimals })
  return asset.symbol === 'NGN' ? `₦${str}` : `${str} ${asset.symbol}`
}
