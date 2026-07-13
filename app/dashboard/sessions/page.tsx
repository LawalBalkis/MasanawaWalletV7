import { getCurrentSessionTokenHash, listCurrentUserSessions, requireUser } from '@/lib/auth/session'
import { SessionsClient, type SessionItem } from './sessions-client'

export default async function SessionsPage() {
  const user = await requireUser()
  const sessions = await listCurrentUserSessions()
  const currentTokenHash = await getCurrentSessionTokenHash()

  const items: SessionItem[] = sessions.map((s) => ({
    tokenHash: s.tokenHash,
    ip: s.ip ?? 'Unknown',
    userAgent: s.userAgent ?? 'Unknown',
    lastSeenAt: s.lastSeenAt ?? s.createdAt ?? new Date().toISOString(),
    createdAt: s.createdAt ?? new Date().toISOString(),
    isCurrent: s.tokenHash === currentTokenHash,
  expiresAt: s.expiresAt,
  }))

  return <SessionsClient sessions={items} userName={user.name} />
}
