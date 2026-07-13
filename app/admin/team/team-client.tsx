'use client'

import { AdminHeader, RoleBadge } from '@/components/admin/primitives'
import { forceSignOutAction, setUserRoleAction } from '@/lib/wallet/admin-actions'
import { useState, useTransition } from 'react'

export interface TeamMember {
  id: string
  name: string
  username: string
  email: string
  role: 'user' | 'admin' | 'superadmin'
  status: string
  createdAt: string
}

export function TeamClient({ members }: { members: TeamMember[] }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function handleRole(userId: string, role: 'user' | 'admin') {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await setUserRoleAction({ userId, role })
      if (result.ok) setSuccess(`Role updated to ${role}.`)
      else setError(result.error ?? 'Failed to update role.')
    })
  }

  function handleSignOut(userId: string) {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await forceSignOutAction({ userId })
      if (result.ok) setSuccess('All sessions revoked for that user.')
      else setError(result.error ?? 'Failed to sign out user.')
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminHeader
        title="Team & roles"
        description="Promote or demote admins and force sign-out of any user's sessions."
      />

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
          {success}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-3">
                    <p className="font-medium text-foreground">{m.name}</p>
                    <p className="text-xs text-muted-foreground">@{m.username}</p>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{m.email}</td>
                  <td className="px-5 py-3"><RoleBadge role={m.role} /></td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      m.status === 'active' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                    }`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      {m.role !== 'superadmin' && (
                        <>
                          {m.role === 'admin' ? (
                            <button
                              onClick={() => handleRole(m.id, 'user')}
                              disabled={pending}
                              className="rounded-md border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-60"
                            >
                              Demote
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRole(m.id, 'admin')}
                              disabled={pending}
                              className="rounded-md border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-60"
                            >
                              Promote
                            </button>
                          )}
                          <button
                            onClick={() => handleSignOut(m.id)}
                            disabled={pending}
                            className="rounded-md border border-destructive/20 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/5 disabled:opacity-60"
                          >
                            Sign out
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
