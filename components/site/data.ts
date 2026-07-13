import {
  ArrowDownToLine,
  BadgeCheck,
  Banknote,
  CircleDollarSign,
  Eye,
  KeyRound,
  RefreshCcw,
  Send,
  ShieldCheck,
  Smartphone,
  UserRoundCheck,
  WalletCards,
} from 'lucide-react'

export const BRAND = 'Masanawa'

export const PRODUCT_FEATURES = [
  { icon: WalletCards, number: '01', title: 'Your own NGN account', body: 'Get a dedicated virtual naira account and fund Masanawa with a regular bank transfer.' },
  { icon: CircleDollarSign, number: '02', title: 'Buy and sell crypto', body: 'Move between naira and supported tokens from one clear, easy-to-review balance.' },
  { icon: Send, number: '03', title: 'Send by username', body: 'Pay another Masanawa user with their @username—no long wallet address to copy.' },
  { icon: RefreshCcw, number: '04', title: 'Convert to naira', body: 'Turn received crypto into NGN when you are ready, with the rate shown before you confirm.' },
  { icon: ArrowDownToLine, number: '05', title: 'Withdraw to your bank', body: 'Send your available NGN balance to a supported Nigerian bank account.' },
  { icon: Smartphone, number: '06', title: 'One money app', body: 'See funding, trades, transfers, conversions, and withdrawals in one activity timeline.' },
]

export const MONEY_FLOW = [
  { step: '01', label: 'Fund', detail: 'Transfer naira to your virtual account', icon: Banknote },
  { step: '02', label: 'Buy', detail: 'Choose a token and review your rate', icon: CircleDollarSign },
  { step: '03', label: 'Send', detail: 'Pay any Masanawa @username', icon: Send },
  { step: '04', label: 'Cash out', detail: 'Convert to NGN and withdraw', icon: ArrowDownToLine },
]

export const SECURITY_POINTS = [
  { icon: UserRoundCheck, title: 'Verified accounts', body: 'Identity and account checks help keep naira funding and withdrawals connected to the right person.' },
  { icon: KeyRound, title: 'Protected access', body: 'Secure sign-in, device controls, and transaction confirmation protect sensitive actions.' },
  { icon: Eye, title: 'Review before you move money', body: 'See the recipient, amount, rate, and applicable fee before you approve a transaction.' },
  { icon: ShieldCheck, title: 'Clear activity records', body: 'Track deposits, trades, username transfers, conversions, and withdrawals in one place.' },
]

export const ASSETS = [
  { symbol: 'NGN', name: 'Nigerian Naira', tone: '₦' },
  { symbol: 'USDT', name: 'Tether', tone: '₮' },
  { symbol: 'USDC', name: 'USD Coin', tone: '$' },
  { symbol: 'BTC', name: 'Bitcoin', tone: '₿' },
  { symbol: 'ETH', name: 'Ethereum', tone: 'Ξ' },
  { symbol: 'SOL', name: 'Solana', tone: 'S' },
]

export const FAQS = [
  { q: 'How do I fund my Masanawa account?', a: 'Open your NGN wallet to view your dedicated virtual account details, then make a bank transfer from an account in your name. Your available balance updates after the transfer is confirmed.' },
  { q: 'Can I send crypto without a wallet address?', a: 'Yes. You can send supported assets to another Masanawa user with their unique @username. Always review the username and amount before confirming.' },
  { q: 'How do I turn received crypto into naira?', a: 'Select the asset, choose Sell or Convert, review the displayed rate and fee, and confirm. The resulting NGN appears in your naira balance and can be withdrawn to a supported bank.' },
  { q: 'How do withdrawals work?', a: 'Add or select a Nigerian bank account in your name, enter the amount, review the details, and confirm. Processing times can vary by bank and service availability.' },
  { q: 'What rates and fees will I pay?', a: 'Masanawa shows the applicable conversion rate and fee before you confirm a buy, sell, transfer, or withdrawal. Blockchain network fees may also apply to external wallet transfers.' },
  { q: 'Is crypto risk-free?', a: 'No. Crypto prices can move significantly and transactions can be irreversible. Review every transaction carefully and only use funds you can afford to expose to market risk.' },
]

export const TRUST_POINTS = ['Virtual NGN account', 'Username transfers', 'Rates shown before confirmation', 'Nigerian bank withdrawals']
export const VERIFIED_LABEL = { icon: BadgeCheck, text: 'Built for everyday money movement in Nigeria' }

export const HERO_STATS = [
  { label: 'Settlement', value: 'Instant' },
  { label: 'Send by', value: '@username' },
  { label: 'Withdraw to', value: 'NG banks' },
  { label: 'Assets', value: 'NGN + 5' },
]
