'use client'

import { Logo } from '@/components/site/logo'
import {
  ArrowDownToLine,
  ArrowLeftRight,
  Banknote,
  LayoutDashboard,
  Menu,
  Send,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/fund', label: 'Fund', icon: Banknote },
  { href: '/dashboard/trade', label: 'Buy / Sell', icon: ArrowLeftRight },
  { href: '/dashboard/send', label: 'Send', icon: Send },
  { href: '/dashboard/withdraw', label: 'Withdraw', icon: ArrowDownToLine },
]

export function AppShell({
  username,
  name,
  children,
}: {
  username: string
  name: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Wallet navigation">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMenuOpen(false)}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <item.icon className="size-4" aria-hidden="true" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 flex-col border-r border-border p-4 lg:flex">
        <Link href="/" className="mb-8 px-1" aria-label="Masanawa home">
          <Logo />
        </Link>
        {nav}
        <div className="mt-auto rounded-lg border border-border bg-card p-3">
          <p className="text-sm font-medium text-foreground">{name}</p>
          <p className="font-mono text-xs text-primary">@{username}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
          <Link href="/" aria-label="Masanawa home">
            <Logo />
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex size-9 items-center justify-center rounded-lg border border-border text-foreground"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </header>

        {menuOpen && (
          <div className="border-b border-border bg-background px-4 py-4 lg:hidden">
            {nav}
            <div className="mt-4 rounded-lg border border-border bg-card p-3">
              <p className="text-sm font-medium text-foreground">{name}</p>
              <p className="font-mono text-xs text-primary">@{username}</p>
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  )
}
