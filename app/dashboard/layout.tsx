import { AppShell } from '@/components/wallet/app-shell'
import { DEMO_USER } from '@/lib/wallet/demo-data'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard · Masanawa',
  description: 'Manage your naira and crypto wallet.',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppShell username={DEMO_USER.username} name={DEMO_USER.name}>
      {children}
    </AppShell>
  )
}
