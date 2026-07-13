'use client'

import { Logo } from '@/components/site/logo'
import { DEMO_NOTIFICATIONS } from '@/lib/wallet/demo-data'
import {
  ArrowDownToLine,
  ArrowLeftRight,
  Banknote,
  Bell,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  QrCode,
  Send,
  Settings,
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
  { href: '/dashboard/receive', label: 'Receive', icon: QrCode },
  { href: '/dashboard/withdraw', label: 'Withdraw', icon: ArrowDownToLine },
  { href: '/dashboard/activity', label: 'Activity', icon: History },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

const UNREAD_COUNT = DEMO_NOTIFICATIONS.filter((n) => !n.read).length

function NotificationBell({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/dashboard/notifications"
      onClick={onNavigate}
      className="relative flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
      aria-label={
        UNREAD_COUNT > 0 ? `Notifications, ${UNREAD_COUNT} unread` : 'Notifications'
      }
    >
      <Bell className="size-4" aria-hidden="true" />
      {UNREAD_COUNT > 0 && (
        <span
          className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary font-mono text-[10px] font-semibold text-primary-foreground"
          aria-hidden="true"
        >
          {UNREAD_COUNT}
        </span>
      )}
    </Link>
  )
}

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
        const active =
          item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href)
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

  const userCard = (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          <p className="font-mono text-xs text-primary">@{username}</p>
        </div>
        <Link
          href="/auth/sign-in"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Sign out"
        >
          <LogOut className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 flex-col border-r border-border p-4 lg:flex">
        <div className="mb-8 flex items-center justify-between px-1">
          <Link href="/" aria-label="Masanawa home">
            <Logo />
          </Link>
          <NotificationBell />
        </div>
        {nav}
        <div className="mt-auto">{userCard}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
          <Link href="/" aria-label="Masanawa home">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell onNavigate={() => setMenuOpen(false)} />
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex size-9 items-center justify-center rounded-lg border border-border text-foreground"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </header>

        {menuOpen && (
          <div className="border-b border-border bg-background px-4 py-4 lg:hidden">
            {nav}
            <div className="mt-4">{userCard}</div>
          </div>
        )}

        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  )
}
