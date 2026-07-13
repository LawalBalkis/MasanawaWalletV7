'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { Logo } from './logo'

const LINKS = [
  { label: 'Buy & sell', href: '#features' },
  { label: 'Send', href: '#flow' },
  { label: 'NGN account', href: '#account' },
  { label: 'Security', href: '#security' },
  { label: 'FAQ', href: '#faq' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8 lg:px-12">
        <a href="#top" aria-label="Masanawa home"><Logo /></a>
        <div className="hidden items-center gap-7 lg:flex">
          {LINKS.map((link) => <a key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">{link.label}</a>)}
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <Link href="/dashboard" className="px-3 py-2 text-sm font-medium text-foreground">Sign in</Link>
          <Link href="/dashboard" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Open Masanawa</Link>
        </div>
        <button type="button" className="inline-flex size-10 items-center justify-center rounded-lg hover:bg-secondary md:hidden" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>
      {open && <div className="border-t border-border bg-background md:hidden"><div className="flex flex-col gap-1 px-4 py-4">
        {LINKS.map((link) => <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-secondary">{link.label}</a>)}
        <Link href="/dashboard" onClick={() => setOpen(false)} className="mt-2 rounded-lg bg-primary px-3 py-3 text-center text-sm font-semibold text-primary-foreground">Open Masanawa</Link>
      </div></div>}
    </header>
  )
}
