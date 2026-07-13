import type { Metadata } from 'next'
import { PageShell, LegalBody } from '@/components/site/page-shell'

export const metadata: Metadata = {
  title: 'Privacy Policy | Masanawa',
  description: 'How Masanawa collects, uses, and protects your information.',
}

const SECTIONS = [
  {
    heading: 'Information we collect',
    body: [
      'We collect information you provide when you create an account and use Masanawa, including your name, contact details, identity verification information, and bank account details used for funding and withdrawals.',
      'We also collect transaction data such as deposits, buys, sells, username transfers, conversions, and withdrawals, along with device and usage information needed to keep your account secure.',
    ],
  },
  {
    heading: 'How we use information',
    body: [
      'We use your information to operate your wallet, process transactions, verify your identity, prevent fraud, meet legal and regulatory obligations, and provide support.',
      'We show transaction details—recipient, amount, rate, and fees—before you confirm, and we keep clear records of your activity so you can review it at any time.',
    ],
  },
  {
    heading: 'Sharing and disclosure',
    body: [
      'We share information with service providers who help us deliver Masanawa, such as identity verification, payment, and banking partners, under agreements that require them to protect your data.',
      'We may disclose information where required by law, regulation, or a valid legal request, or to protect the rights, safety, and property of our users and Masanawa.',
    ],
  },
  {
    heading: 'Data retention and security',
    body: [
      'We retain your information for as long as your account is active and as required to meet legal, accounting, and regulatory obligations.',
      'We use secure sign-in, access controls, and transaction confirmation to protect your account. No system is perfectly secure, so we encourage you to protect your credentials and never share your password or PIN.',
    ],
  },
  {
    heading: 'Your choices and rights',
    body: [
      'You can review your activity, update certain account details, and contact us with questions about your data. Some information must be retained to meet regulatory requirements even after a request.',
      'To make a privacy request, contact us at privacy@masanawa.app.',
    ],
  },
]

export default function PrivacyPage() {
  return (
    <PageShell
      eyebrow="Privacy"
      title="Privacy Policy"
      description="This policy explains what information Masanawa collects, how we use it, and the choices you have. It is a general template and not legal advice."
    >
      <LegalBody sections={SECTIONS} updated="July 2026" />
    </PageShell>
  )
}
