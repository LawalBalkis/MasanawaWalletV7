import type { Metadata } from 'next'
import { PageShell, LegalBody } from '@/components/site/page-shell'

export const metadata: Metadata = {
  title: 'Cookie Policy | Masanawa',
  description: 'How Masanawa uses cookies and similar technologies.',
}

const SECTIONS = [
  {
    heading: 'What cookies are',
    body: [
      'Cookies are small text files stored on your device when you visit a website or use a web app. They help the service work, remember your preferences, and understand how it is used.',
      'We also use similar technologies such as local storage and session identifiers for the same purposes.',
    ],
  },
  {
    heading: 'How we use them',
    body: [
      'We use strictly necessary cookies to keep you signed in, secure your session, and protect against fraud. These are required for Masanawa to function.',
      'We use preference and analytics technologies to remember settings and understand aggregate usage so we can improve the product.',
    ],
  },
  {
    heading: 'Managing cookies',
    body: [
      'You can control or delete cookies through your browser settings. Blocking strictly necessary cookies may prevent parts of Masanawa from working, including staying signed in.',
      'Where required, we ask for your consent before using non-essential cookies.',
    ],
  },
  {
    heading: 'Changes and contact',
    body: [
      'We may update this policy as our use of cookies evolves. Material changes will be reflected on this page.',
      'Questions can be sent to privacy@masanawa.app.',
    ],
  },
]

export default function CookiesPage() {
  return (
    <PageShell
      eyebrow="Cookies"
      title="Cookie Policy"
      description="This policy explains how Masanawa uses cookies and similar technologies. It is a general template and not legal advice."
    >
      <LegalBody sections={SECTIONS} updated="July 2026" />
    </PageShell>
  )
}
