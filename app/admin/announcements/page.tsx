import { requireAdmin } from '@/lib/auth/session'
import { AnnouncementsClient } from './announcements-client'

export default async function AdminAnnouncementsPage() {
  await requireAdmin()
  return <AnnouncementsClient />
}
