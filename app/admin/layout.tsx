import { AdminShell } from '@/components/admin/admin-shell'
import { ToastProvider } from '@/components/wallet/toast'
import { getCurrentUser } from '@/lib/auth/session'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Admin · Masanawa',
  description: 'Platform administration console.',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/sign-in')
  // Non-admins never see the console — bounce them back to their wallet.
  if (user.role !== 'admin') redirect('/dashboard')

  return (
    <ToastProvider>
      <AdminShell name={user.name} username={user.username}>
        {children}
      </AdminShell>
    </ToastProvider>
  )
}
