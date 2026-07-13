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

// ---------------------------------------------------------------------------
// Extended demo data: users directory, fees, beneficiaries, notifications,
// deposit addresses, price history, full transaction history.
// All of this is replaced by real backend data in the final wiring step.
// ---------------------------------------------------------------------------

/** Known Masanawa users, used to resolve @username before sending. */
export const DEMO_DIRECTORY: Record<string, { name: string; username: string }> = {
  chinedu: { name: 'Chinedu Eze', username: 'chinedu' },
  femi: { name: 'Femi Adeyemi', username: 'femi' },
  amaka: { name: 'Amaka Nwosu', username: 'amaka' },
  tunde: { name: 'Tunde Bakare', username: 'tunde' },
  zainab: { name: 'Zainab Bello', username: 'zainab' },
  emeka: { name: 'Emeka Obi', username: 'emeka' },
}

export function resolveUsername(handle: string): { name: string; username: string } | null {
  const clean = handle.trim().replace(/^@/, '').toLowerCase()
  return DEMO_DIRECTORY[clean] ?? null
}

/** Fee model shown at review time. Wallet-to-wallet sends are free. */
export const FEES = {
  send: 0,
  /** 1% trade fee, min ₦100 */
  tradeRate: 0.01,
  tradeMinNgn: 100,
  /** Flat NGN bank withdrawal fee */
  withdrawNgn: 50,
}

export function tradeFeeNgn(ngnAmount: number): number {
  return Math.max(ngnAmount * FEES.tradeRate, FEES.tradeMinNgn)
}

/** Demo account-name resolution for bank withdrawals. */
export function resolveBankAccount(bank: string, accountNumber: string): string | null {
  if (!/^\d{10}$/.test(accountNumber)) return null
  const names = ['Adaeze Okafor', 'Okafor Adaeze Chiamaka']
  return `${names[Number(accountNumber[9]) % names.length]}`
}

export interface Beneficiary {
  id: string
  bank: string
  accountNumber: string
  accountName: string
}

export const DEMO_BENEFICIARIES: Beneficiary[] = [
  { id: 'ben_01', bank: 'GTBank', accountNumber: '0122334521', accountName: 'Adaeze Okafor' },
  { id: 'ben_02', bank: 'Kuda', accountNumber: '2003456789', accountName: 'Adaeze Okafor' },
]

/** Demo crypto deposit addresses per asset. */
export const DEPOSIT_ADDRESSES: Partial<Record<AssetSymbol, { address: string; network: string }>> = {
  USDT: { address: 'TXk4mQ9pW2vE8rN3yLcA7bZjD5sF6hG1uK', network: 'Tron (TRC-20)' },
  USDC: { address: '0x8f3Ca1b92Dd47e6A50cB1fE29a04D8b7C6e5F2a1', network: 'Ethereum (ERC-20)' },
  BTC: { address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', network: 'Bitcoin' },
  ETH: { address: '0x8f3Ca1b92Dd47e6A50cB1fE29a04D8b7C6e5F2a1', network: 'Ethereum' },
  SOL: { address: '7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsSKCT38X', network: 'Solana' },
}

export interface WalletNotification {
  id: string
  title: string
  body: string
  date: string
  read: boolean
  txId?: string
}

export const DEMO_NOTIFICATIONS: WalletNotification[] = [
  { id: 'nt_01', title: 'Payment received', body: 'You received 50 USDT from @chinedu.', date: '2026-07-12T14:32:00Z', read: false, txId: 'tx_01' },
  { id: 'nt_02', title: 'Wallet funded', body: '₦200,000 arrived from your bank transfer.', date: '2026-07-11T09:15:00Z', read: false, txId: 'tx_02' },
  { id: 'nt_03', title: 'Purchase complete', body: 'You bought 0.0012 BTC for ₦202,080.', date: '2026-07-10T18:47:00Z', read: true, txId: 'tx_03' },
  { id: 'nt_04', title: 'Security reminder', body: 'Enable two-factor authentication to keep your account safer.', date: '2026-07-09T08:00:00Z', read: true },
  { id: 'nt_05', title: 'Withdrawal completed', body: '₦150,000 arrived at GTBank ••4521.', date: '2026-07-08T11:30:00Z', read: true, txId: 'tx_05' },
]

/** Full transaction history (superset of RECENT_TRANSACTIONS). */
export const ALL_TRANSACTIONS: WalletTx[] = [
  ...RECENT_TRANSACTIONS,
  { id: 'tx_07', type: 'receive', asset: 'NGN', amount: 45000, ngnValue: 45000, counterparty: '@amaka', note: 'Rent contribution', status: 'completed', date: '2026-07-05T13:20:00Z' },
  { id: 'tx_08', type: 'buy', asset: 'SOL', amount: 1.2, ngnValue: 280800, note: 'Bought with NGN', status: 'completed', date: '2026-07-03T10:05:00Z' },
  { id: 'tx_09', type: 'send', asset: 'NGN', amount: -20000, ngnValue: 20000, counterparty: '@tunde', note: 'Data subscription', status: 'completed', date: '2026-07-01T19:42:00Z' },
  { id: 'tx_10', type: 'fund', asset: 'NGN', amount: 350000, ngnValue: 350000, note: 'Bank transfer', status: 'completed', date: '2026-06-28T08:55:00Z' },
  { id: 'tx_11', type: 'sell', asset: 'USDT', amount: -100, ngnValue: 158500, note: 'Sold to NGN', status: 'completed', date: '2026-06-25T15:12:00Z' },
  { id: 'tx_12', type: 'withdraw', asset: 'NGN', amount: -80000, ngnValue: 80000, note: 'Kuda ••6789', status: 'completed', date: '2026-06-22T12:00:00Z' },
  { id: 'tx_13', type: 'receive', asset: 'ETH', amount: 0.03, ngnValue: 168600, counterparty: '@zainab', note: 'Design work', status: 'completed', date: '2026-06-19T17:30:00Z' },
  { id: 'tx_14', type: 'buy', asset: 'USDC', amount: 120.5, ngnValue: 190631, note: 'Bought with NGN', status: 'completed', date: '2026-06-15T09:48:00Z' },
  { id: 'tx_15', type: 'send', asset: 'USDT', amount: -60, ngnValue: 95100, counterparty: '@emeka', note: 'Loan repayment', status: 'completed', date: '2026-06-12T20:15:00Z' },
  { id: 'tx_16', type: 'fund', asset: 'NGN', amount: 500000, ngnValue: 500000, note: 'Bank transfer', status: 'completed', date: '2026-06-08T07:30:00Z' },
]

export function txById(id: string): WalletTx | null {
  return ALL_TRANSACTIONS.find((t) => t.id === id) ?? null
}

export type ChartRange = '1W' | '1M' | '1Y'

/** Deterministic pseudo-random NGN price history for an asset. */
export function priceHistory(symbol: AssetSymbol, range: ChartRange): { date: string; price: number }[] {
  const asset = assetBySymbol(symbol)
  const points = range === '1W' ? 7 : range === '1M' ? 30 : 52
  const stepDays = range === '1Y' ? 7 : 1
  const volatility = symbol === 'NGN' ? 0 : symbol === 'USDT' || symbol === 'USDC' ? 0.004 : 0.035
  const seedBase = symbol.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  const now = new Date('2026-07-13T00:00:00Z').getTime()
  const out: { date: string; price: number }[] = []
  let price = asset.ngnRate
  // Walk backwards deterministically, then reverse so it ends at today's rate.
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
