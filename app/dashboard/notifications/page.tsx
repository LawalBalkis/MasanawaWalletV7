import { requireUser } from '@/lib/auth/session'
import { walletStore } from '@/lib/wallet/store'
import { NotificationsClient } from './notifications-client'

export default async function NotificationsPage() {
  const user = await requireUser()
  const notifications = await walletStore.listNotifications(user.id)
  return <NotificationsClient notifications={notifications} />
}
