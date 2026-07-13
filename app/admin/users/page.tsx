import { AdminHeader, RoleBadge, StatusBadge, TierBadge } from '@/components/admin/primitives'
import { UserSearch } from '@/components/admin/user-search'
import { requireAdmin } from '@/lib/auth/session'
import { walletStore } from '@/lib/wallet/store'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

const PAGE_SIZE = 25

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  await requireAdmin()
  const { q } = await searchParams
  const search = q?.trim() || undefined
  const [users, total] = await Promise.all([
    walletStore.listUsers({ search, limit: PAGE_SIZE }),
    walletStore.countUsers(search),
  ])

  return (
    <div className="flex flex-col gap-6">
      <AdminHeader
        title="Users"
        description="Search the directory and open an account to manage verification, status, PIN and balance."
      />

      <UserSearch initial={q ?? ''} />

      <p className="text-sm text-muted-foreground">
        {search ? (
          <>
            {total} result{total === 1 ? '' : 's'} for &ldquo;{search}&rdquo;
          </>
        ) : (
          <>
            {total} user{total === 1 ? '' : 's'} total
          </>
        )}
        {total > PAGE_SIZE ? ` · showing first ${PAGE_SIZE}` : ''}
      </p>

      {users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">No users match your search.</p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-card">
          {users.map((u) => (
            <li key={u.id} className="border-b border-border last:border-b-0">
              <Link
                href={`/admin/users/${u.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-secondary/50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                    {u.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
                      {u.name}
                      <RoleBadge role={u.role} />
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      @{u.username} · {u.email}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="hidden sm:inline">
                    <StatusBadge status={u.status} />
                  </span>
                  <TierBadge tier={u.tier} />
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
