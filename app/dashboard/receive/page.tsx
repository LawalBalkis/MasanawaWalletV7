import { requireUser } from '@/lib/auth/session'
import { ReceiveClient } from './receive-client'

export default async function ReceivePage() {
  const user = await requireUser()
  return <ReceiveClient username={user.username} />
}
