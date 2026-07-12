import {
  Layers,
  ShieldCheck,
  Send,
  Activity,
  ScanFace,
  Wallet,
  KeyRound,
  Radar,
} from 'lucide-react'

export const BRAND = 'Masanawa'

export const CHAINS = [
  'Ethereum',
  'Base',
  'Arbitrum',
  'Optimism',
  'BNB Chain',
  'Solana',
  'TRON',
]

export const FEATURES = [
  {
    icon: Layers,
    title: 'One wallet, every chain',
    body: 'Manage Ethereum, Base, Arbitrum, Optimism, BNB Chain, Solana, and TRON side by side in a single unified portfolio.',
  },
  {
    icon: KeyRound,
    title: 'True self-custody',
    body: 'Your private keys are generated and stored on-device, encrypted at rest. We never see them, and neither does anyone else.',
  },
  {
    icon: Send,
    title: 'Send anything, instantly',
    body: 'Transfer native coins and tokens — ERC-20, SPL, and TRC-20 — with live fee estimates before you confirm.',
  },
  {
    icon: Activity,
    title: 'Live activity tracking',
    body: 'Every transaction is recorded and monitored from pending to confirmed, so you always know exactly where funds are.',
  },
  {
    icon: ScanFace,
    title: 'Biometric + PIN lock',
    body: 'Unlock with Face ID, Touch ID, or a PIN. Auto-lock keeps your vault sealed the moment you step away.',
  },
  {
    icon: Radar,
    title: 'Real-time balances',
    body: 'Prices and balances refresh automatically across every network, valued in the currency you choose.',
  },
] as const

export const STEPS = [
  {
    label: 'STEP 01',
    title: 'Create or import',
    body: 'Spin up a fresh multi-chain wallet in seconds, or import an existing seed phrase. Everything happens on your device.',
  },
  {
    label: 'STEP 02',
    title: 'Secure it',
    body: 'Set a PIN and enable biometrics. Your recovery phrase is encrypted locally and never uploaded anywhere.',
  },
  {
    label: 'STEP 03',
    title: 'Send & track',
    body: 'Move tokens across any supported chain and watch each transfer confirm in your live activity feed.',
  },
] as const

export const SECURITY_POINTS = [
  {
    icon: ShieldCheck,
    title: 'Non-custodial by design',
    body: 'You hold the keys. Masanawa can never freeze, move, or access your funds.',
  },
  {
    icon: Wallet,
    title: 'Encrypted on-device vault',
    body: 'Keys and seed phrases are encrypted with device-level security and never leave your phone.',
  },
  {
    icon: ScanFace,
    title: 'Auto-lock & biometrics',
    body: 'Sessions lock automatically and require Face ID, Touch ID, or a PIN to reopen.',
  },
] as const

export const ASSETS = [
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'BNB', name: 'BNB' },
  { symbol: 'TRX', name: 'TRON' },
  { symbol: 'USDC', name: 'USD Coin' },
  { symbol: 'USDT', name: 'Tether' },
  { symbol: 'DAI', name: 'Dai' },
  { symbol: 'ARB', name: 'Arbitrum' },
]

export const FAQS = [
  {
    q: 'Is Masanawa really non-custodial?',
    a: 'Yes. Your private keys are generated and stored only on your device. We have no servers that hold your keys or funds, which means you are always in full control.',
  },
  {
    q: 'Which blockchains are supported?',
    a: 'Masanawa supports Ethereum, Base, Arbitrum, Optimism, BNB Chain, Solana, and TRON today, with more networks added regularly.',
  },
  {
    q: 'What happens if I lose my phone?',
    a: 'Your recovery phrase is the master backup. As long as you have saved it securely, you can restore your entire wallet on a new device in minutes.',
  },
  {
    q: 'Does it cost anything to use?',
    a: 'Masanawa is free to download and use. You only ever pay the standard network (gas) fees required by each blockchain to process your transactions.',
  },
  {
    q: 'Can I send both coins and tokens?',
    a: 'Absolutely. You can send native assets as well as ERC-20, SPL, and TRC-20 tokens, with a clear fee estimate shown before every transfer.',
  },
] as const
