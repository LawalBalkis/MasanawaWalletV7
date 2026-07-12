import { Logo } from './logo'
import { BRAND } from './data'

const COLUMNS = [
  {
    title: 'Product',
    links: ['Features', 'Security', 'Supported chains', 'Download'],
  },
  {
    title: 'Company',
    links: ['About', 'Blog', 'Careers', 'Press'],
  },
  {
    title: 'Resources',
    links: ['Help center', 'Recovery guide', 'Status', 'Contact'],
  },
  {
    title: 'Legal',
    links: ['Privacy', 'Terms', 'Disclosures', 'Cookies'],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_repeat(4,1fr)]">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              The self-custody, multi-chain crypto wallet. Your keys, your coins — on every chain.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
              <ul className="mt-4 flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {BRAND}. All rights reserved.
          </p>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            Crypto assets are volatile and involve risk. {BRAND} is a non-custodial wallet; you are
            solely responsible for securing your recovery phrase.
          </p>
        </div>
      </div>
    </footer>
  )
}
