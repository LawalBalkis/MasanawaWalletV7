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
    heading: 'Using the services',
    body: [
      'Masanawa lets you fund a naira balance, buy and sell supported assets, send to other users by username, convert to naira, and withdraw to a supported Nigerian bank account in your name.',
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
