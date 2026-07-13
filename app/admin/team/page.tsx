import { requireAdmin } from '@/lib/auth/session'
import { walletStore } from '@/lib/wallet/store'
import { TeamClient, type TeamMember } from './team-client'

export default async function AdminTeamPage() {
  const admin = await requireAdmin()
  const allUsers = await walletStore.listUsers({ limit: 500 })
  const members: TeamMember[] = allUsers
    .filter((u) => u.role !== 'user' || u.status !== 'frozen')
    .map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      email: u.email,
      role: u.role as 'user' | 'admin' | 'superadmin',
      status: u.status,
      createdAt: u.createdAt,
    }))
    .sort((a, b) => (a.role === 'superadmin' ? -1 : a.role === 'admin' ? -1 : 1) - (b.role === 'superadmin' ? -1 : b.role === 'admin' ? -1 : 1))

  return <TeamClient members={members} />
}
