'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/wallet/toast'
import {
  adjustBalanceAction,
  resetUserPinAction,
  setUserStatusAction,
  setUserTierAction,
  verifyUserEmailAction,
  type AdminResult,
} from '@/lib/wallet/admin-actions'
import { formatNgn } from '@/lib/wallet/assets'
import type { TierId } from '@/lib/wallet/tiers'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export interface AdminUserView {
  id: string
  name: string
  username: string
  role: 'user' | 'admin' | 'superadmin'
  status: 'active' | 'frozen'
  tier: TierId
  emailVerified: boolean
  hasPin: boolean
  ngnBalance: number
}

export function UserActions({ user }: { user: AdminUserView }) {
  const { toast } = useToast()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [tier, setTier] = useState<string>(String(user.tier))
  const [balanceAmount, setBalanceAmount] = useState('')
  const [balanceDirection, setBalanceDirection] = useState<'credit' | 'debit'>('credit')
  const [balanceReason, setBalanceReason] = useState('')
  const [pinReason, setPinReason] = useState('')
  const [freezeReason, setFreezeReason] = useState('')

  const isAdmin = user.role === 'admin' || user.role === 'superadmin'

  async function run(fn: () => Promise<AdminResult>, successMsg: string) {
    setPending(true)
    try {
      const result = await fn()
      if (result.ok) {
        toast('Success', successMsg, 'success')
        router.refresh()
      } else {
        toast('Error', result.error ?? 'Something went wrong.')
      }
    } catch {
      toast('Error', 'An unexpected error occurred.')
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="mb-5 text-base font-semibold text-foreground">Admin actions</h2>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-foreground">Account status</h3>
          <div className="flex flex-wrap gap-2">
            {user.status === 'active' ? (
              <Button variant="outline" disabled={pending || isAdmin}
                onClick={() => run(() => setUserStatusAction({ userId: user.id, status: 'frozen', reason: freezeReason }), 'Account frozen')}>
                Freeze account
              </Button>
            ) : (
              <Button variant="outline" disabled={pending}
                onClick={() => run(() => setUserStatusAction({ userId: user.id, status: 'active' }), 'Account reactivated')}>
                Reactivate account
              </Button>
            )}
          </div>
          {user.status === 'active' && !isAdmin && (
            <Input placeholder="Reason (optional)" value={freezeReason} onChange={(e) => setFreezeReason(e.target.value)} className="max-w-xs" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-foreground">Verification tier</h3>
          <div className="flex flex-wrap gap-2">
            <Select value={tier} onChange={(e) => setTier(e.target.value)} disabled={pending}>
              <option value="1">Tier 1</option>
              <option value="2">Tier 2</option>
              <option value="3">Tier 3</option>
            </Select>
            <Button variant="outline" disabled={pending || Number(tier) === user.tier}
              onClick={() => run(() => setUserTierAction({ userId: user.id, tier: Number(tier) }), `Tier set to ${tier}`)}>
              Set tier
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-foreground">Email verification</h3>
          <Button variant="outline" disabled={pending || user.emailVerified}
            onClick={() => run(() => verifyUserEmailAction({ userId: user.id }), 'Email verified')}>
            {user.emailVerified ? 'Already verified' : 'Verify email'}
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-foreground">Transaction PIN</h3>
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Reason (optional)" value={pinReason} onChange={(e) => setPinReason(e.target.value)} className="max-w-xs" disabled={isAdmin || !user.hasPin} />
            <Button variant="outline" disabled={pending || isAdmin || !user.hasPin}
              onClick={() => run(() => resetUserPinAction({ userId: user.id, reason: pinReason }), 'PIN reset')}>
              Reset PIN
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-foreground">Manual balance adjustment</h3>
          <div className="flex flex-wrap gap-2">
            <Select value={balanceDirection} onChange={(e) => setBalanceDirection(e.target.value as 'credit' | 'debit')} disabled={pending || isAdmin}>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </Select>
            <Input type="number" placeholder="Amount (NGN)" value={balanceAmount} onChange={(e) => setBalanceAmount(e.target.value)} className="w-32" disabled={pending || isAdmin} />
            <Input placeholder="Reason (required)" value={balanceReason} onChange={(e) => setBalanceReason(e.target.value)} className="flex-1 min-w-48" disabled={pending || isAdmin} />
            <Button variant="outline" disabled={pending || isAdmin || !balanceAmount || !balanceReason.trim()}
              onClick={() => run(() => adjustBalanceAction({ userId: user.id, direction: balanceDirection, amount: Number(balanceAmount), reason: balanceReason }), `Balance ${balanceDirection === 'credit' ? 'credited' : 'debited'}`)}>
              Apply
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Current NGN balance: {formatNgn(user.ngnBalance)}</p>
        </div>
      </div>
    </section>
  )
}
