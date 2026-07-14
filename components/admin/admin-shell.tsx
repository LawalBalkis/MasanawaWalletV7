'use client'

import { Logo } from '@/components/site/logo'
import { signOutAction } from '@/lib/auth/actions'
import { ArrowLeft, Banknote, ChartBar as BarChart3, LayoutDashboard, LogOut, Megaphone, Menu, Receipt, ScrollText, Settings, Users, UserCog, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/transactions', label: 'Transactions', icon: Receipt },
  { href: '/admin/fundings', label: 'Fundings', icon: Banknote },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/settings', label: 'Platform config', icon: Settings },
  { href: '/admin/team', label: 'Team', icon: UserCog },
  { href: '/admin/p2p', label: 'P2P Console', icon: BarChart3 },
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/admin/audit', label: 'Audit log', icon: ScrollText },
]

export function AdminShell({
  name,
  username,
  children,
}: {
  name: string
  username: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Admin navigation">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href)
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

  const footer = (
    <div className="flex flex-col gap-3">
      <Link
        href="/dashboard"
        onClick={() => setMenuOpen(false)}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to wallet
      </Link>
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{name}</p>
            <p className="font-mono text-xs text-primary">@{username}</p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Sign out"
            >
              <LogOut className="size-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )

  const brand = (
    <div className="flex items-center gap-2">
      <Link href="/admin" aria-label="Masanawa admin home">
        <Logo />
      </Link>
      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
        Admin
      </span>
    </div>
  )

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 flex-col border-r border-border p-4 lg:flex">
        <div className="mb-8 px-1">{brand}</div>
        {nav}
        <div className="mt-auto">{footer}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
          {brand}
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
            <div className="mt-4">{footer}</div>
          </div>
        )}

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  )
}
