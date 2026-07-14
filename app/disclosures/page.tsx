import type { Metadata } from 'next'
import { PageShell, LegalBody } from '@/components/site/page-shell'

export const metadata: Metadata = {
  title: 'Disclosures | Masanawa',
  description: 'Important information about MSN, naira display, and what Masanawa is and is not.',
}

const SECTIONS = [
  {
    heading: 'What is MSN?',
    body: [
      'MSN (Masanawa Token) is a closed-loop virtual platform token used as the medium of exchange within Masanawa. 1 MSN is always redeemable for ₦1.',
      'MSN is not e-money. It is not issued by a bank, is not insured by the NDIC, and is not a deposit. MSN is a limited, revocable license to use platform services.',
      'MSN cannot be transferred off-platform, is not listed on any exchange, and has no secondary market. Its only value is its 1:1 redemption right against the platform.',
    ],
  },
  {
    heading: 'Naira display equivalence',
    body: [
      'Every ₦ figure shown in the Masanawa app is the fixed redemption equivalent of MSN at 1 MSN = ₦1. It is not a statement of a naira account balance.',
      'When you see "₦125,000" on your dashboard, your balance is 125,000 MSN, redeemable for ₦125,000. The naira figure is informational; the held asset is MSN.',
    ],
  },
  {
    heading: 'Masanawa is not a bank',
    body: [
      'Masanawa is a digital-asset wallet and P2P trading platform. It is not a bank, a deposit-taker, a money remitter, or an e-money issuer.',
      'Naira received via bank transfer is consideration for the purchase of MSN, converted at the moment of receipt. The platform does not hold customer naira balances — it holds MSN, which users redeem for naira at withdrawal.',
    ],
  },
  {
    heading: 'P2P trading',
    body: [
      'In the P2P marketplace, users trade crypto for MSN with each other. The platform custodies escrowed assets and arbitrates disputes but does not take market risk.',
      'P2P trades settle token-for-token — both legs (MSN and crypto) are internal balances. No naira moves between users during a P2P trade.',
    ],
  },
  {
    heading: 'Risk warning',
    body: [
      'Crypto assets are volatile and can lose value rapidly. Only transact with funds you can afford to lose.',
      'Blockchain transactions are generally irreversible. Always verify recipient addresses and amounts before confirming.',
    ],
  },
  {
    heading: 'Regulatory status',
    body: [
      'Masanawa operates under Nigeria\u2019s ISA 2025 virtual-asset service provider (VASP) framework where applicable. MSN\u2019s closed-loop design reduces banking and e-money exposure but does not eliminate VASP obligations.',
      'This disclosure page is for informational purposes and is not legal advice.',
    ],
  },
]

export default function DisclosuresPage() {
  return (
    <PageShell
      eyebrow="Disclosures"
      title="Platform Disclosures"
      description="Important information about MSN, how naira figures work, and what Masanawa is and is not."
    >
      <LegalBody sections={SECTIONS} updated="July 2026" />
    </PageShell>
  )
}
