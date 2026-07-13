import Link from 'next/link'
import { Logo } from './logo'
import { BRAND } from './data'

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Buy & sell', href: '/#features' },
      { label: 'Send by username', href: '/#flow' },
      { label: 'NGN account', href: '/#account' },
      { label: 'Get started', href: '/#get-started' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Careers', href: '/careers' },
      { label: 'Press', href: '/press' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Help center', href: '/help' },
      { label: 'FAQ', href: '/#faq' },
      { label: 'Status', href: '/status' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Disclosures', href: '/disclosures' },
      { label: 'Cookies', href: '/cookies' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-8 sm:py-16 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_repeat(4,1fr)] lg:gap-12">
          <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Buy, sell, and send crypto in Nigeria. Fund with naira, pay any @username, and
              withdraw to your bank.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 text-center sm:grid-cols-4 sm:text-left lg:col-span-4 lg:contents">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
                <ul className="mt-4 flex flex-col gap-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center gap-4 border-t border-border pt-8 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {BRAND}. All rights reserved.
          </p>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            Crypto asset prices are volatile and transactions can be irreversible. Rates, fees, and
            service availability are shown in-app before you confirm and may vary by asset, bank,
            and account status.
          </p>
        </div>
      </div>
    </footer>
  )
}
