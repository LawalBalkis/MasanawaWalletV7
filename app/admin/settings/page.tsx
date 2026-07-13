import { requireAdmin } from '@/lib/auth/session'
import { getPlatformConfig } from '@/lib/config'
import { ConfigClient, type PlatformConfig } from './config-client'

export default async function AdminSettingsPage() {
  await requireAdmin()
  const config = await getPlatformConfig()
  return <ConfigClient config={config as PlatformConfig} />
}
