import { AppShell } from '@/components/wallet/app-shell'
import { ToastProvider } from '@/components/wallet/toast'
import { getCurrentUser } from '@/lib/auth/session'
import { walletStore } from '@/lib/wallet/store'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Dashboard · Masanawa',
  description: 'Manage your naira and crypto wallet.',
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/sign-in')
  if (!user.pinHash) redirect('/auth/pin')

  const unreadCount = await walletStore.getUnreadCount(user.id)

  return (
    <ToastProvider>
      <AppShell
        username={user.username}
        name={user.name}
        unreadCount={unreadCount}
        isAdmin={user.role === 'admin'}
      >
        {children}
      </AppShell>
    </ToastProvider>
  )
}
