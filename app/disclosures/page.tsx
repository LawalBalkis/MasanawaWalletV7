import type { Metadata } from 'next'
import { PageShell, LegalBody } from '@/components/site/page-shell'

export const metadata: Metadata = {
  title: 'Disclosures | Masanawa',
  description: 'Important risk, rate, and service disclosures for Masanawa users.',
}

const SECTIONS = [
  {
    heading: 'Crypto risk',
    body: [
      'Crypto assets are volatile and their value can rise or fall significantly in a short period. You may lose some or all of the value you convert into crypto.',
      'Only transact with funds you can afford to expose to market risk. Past performance of any asset is not a reliable indicator of future results.',
    ],
  },
  {
    heading: 'Irreversibility of transactions',
    body: [
      'Crypto transactions can be irreversible. Once a transfer or conversion is confirmed, it may not be possible to reverse or recover it.',
      'Always review the recipient, amount, rate, and fees shown before confirming any transaction.',
    ],
  },
  {
    heading: 'Rates and fees',
    body: [
      'Conversion rates and fees are displayed in-app before you confirm and may change based on market conditions, the asset, your bank, and your account status.',
      'Blockchain network fees may apply to transfers to external wallets and are separate from Masanawa fees.',
    ],
  },
  {
    heading: 'Service availability',
    body: [
      'Funding, trading, transfers, conversions, and withdrawals depend on partners and network conditions and may be delayed or temporarily unavailable.',
      'Processing times can vary by bank. Current operational status is shown on our status page and transaction details are shown in-app.',
    ],
  },
  {
    heading: 'No investment advice',
    body: [
      'Masanawa provides tools to move between naira and crypto. We do not provide investment, tax, or legal advice, and nothing in the app is a recommendation to buy or sell any asset.',
      'Consider seeking independent professional advice before making financial decisions.',
    ],
  },
]

export default function DisclosuresPage() {
  return (
    <PageShell
      eyebrow="Disclosures"
      title="Important disclosures"
      description="Please read these disclosures about risk, rates, and service availability. This is general information and not legal or financial advice."
    >
      <LegalBody sections={SECTIONS} updated="July 2026" />
    </PageShell>
  )
}
