import type { Metadata } from 'next'
import { PageShell, LegalBody } from '@/components/site/page-shell'

export const metadata: Metadata = {
  title: 'Terms of Service | Masanawa',
  description: 'The terms that govern your use of Masanawa.',
}

const SECTIONS = [
  {
    heading: 'Accepting these terms',
    body: [
      'By creating a Masanawa account or using our services, you agree to these Terms of Service. If you do not agree, do not use Masanawa.',
      'You must be of legal age and eligible to use financial services in your jurisdiction, and the information you provide must be accurate and kept up to date.',
    ],
  },
  {
    heading: 'Your account',
    body: [
      'You are responsible for keeping your credentials, password, and PIN confidential and for all activity on your account. Notify us immediately if you suspect unauthorized access.',
      'We may require identity verification and may limit, suspend, or close accounts to comply with law, prevent fraud, or protect users and the platform.',
    ],
  },
  {
    heading: 'What Masanawa is',
    body: [
      'Masanawa is a digital-asset wallet and P2P trading platform powered by the Masanawa Token (MSN). Masanawa is not a bank, a deposit-taker, a money remitter, an e-money issuer, or an investment scheme.',
      'Naira (NGN) is used only as an entry and exit rail. When you fund your wallet via bank transfer, you are purchasing MSN at a fixed rate of 1 MSN = ₦1. When you withdraw, you are redeeming MSN for NGN paid to your bank account.',
    ],
  },
  {
    heading: 'The Masanawa Token (MSN)',
    body: [
      'MSN is a closed-loop virtual platform token. It exists only inside Masanawa, cannot be transferred off-platform, is not listed on any exchange, and has no value outside the platform except its redemption right.',
      '1 MSN is always redeemable for ₦1. MSN is not an investment and is not marketed as one. No interest or yield is paid on MSN balances.',
      'MSN is defined in these Terms as a limited, revocable license to use platform services — not a deposit, not e-money, and not a security.',
      'All ₦ figures displayed in the app are the fixed redemption equivalent of MSN, not a statement of a naira account balance.',
    ],
  },
  {
    heading: 'P2P trading and escrow',
    body: [
      'Users may trade crypto for MSN with other users through the P2P escrow marketplace. When you create an offer or take an order, the platform custodies the escrowed asset until settlement.',
      'In the default instant settlement mode, payment and release happen atomically — MSN is debited from the buyer and crypto is released from escrow in a single operation.',
      'Either party may open a dispute on an active order. Funds remain locked in escrow until an admin resolves the dispute. Resolution may result in release to the buyer or refund to the seller.',
      'You agree to trade honestly and in good faith. Fraudulent offers, mispriced listings, or coercion may result in account suspension and forfeiture of escrowed funds.',
    ],
  },
  {
    heading: 'Using the services',
    body: [
      'Masanawa lets you fund your wallet with naira (which purchases MSN), buy and sell supported crypto assets using MSN, send MSN and crypto to other users by username, and redeem MSN for naira withdrawn to a supported Nigerian bank account in your name.',
      'You agree to use Masanawa only for lawful purposes and not to engage in fraud, money laundering, or any activity that violates applicable law or these terms.',
    ],
  },
  {
    heading: 'Rates, fees, and transactions',
    body: [
      'Applicable rates and fees are shown before you confirm a transaction and may vary by asset, bank, and account status. Blockchain network fees may apply to external transfers.',
      'Crypto transactions can be irreversible. Review every transaction carefully; once confirmed, a transaction may not be able to be reversed or recovered.',
    ],
  },
  {
    heading: 'Risk and limitation of liability',
    body: [
      'Crypto asset prices are volatile and you may lose value. You use Masanawa at your own risk and should only transact with funds you can afford to expose to market risk.',
      'To the extent permitted by law, Masanawa is not liable for indirect or consequential losses, or for losses arising from your failure to secure your account or from market movements.',
    ],
  },
  {
    heading: 'Changes and contact',
    body: [
      'We may update these terms from time to time. Continued use of Masanawa after changes take effect means you accept the updated terms.',
      'Questions about these terms can be sent to legal@masanawa.app.',
    ],
  },
]

export default function TermsPage() {
  return (
    <PageShell
      eyebrow="Terms"
      title="Terms of Service"
      description="These terms govern your use of Masanawa. This is a general template and not legal advice."
    >
      <LegalBody sections={SECTIONS} updated="July 2026" />
    </PageShell>
  )
}
