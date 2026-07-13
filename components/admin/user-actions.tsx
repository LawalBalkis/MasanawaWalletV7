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
  role: 'user' | 'admin'
  status: 'active' | 'frozen'
  tier: TierId
  emailVerified: boolean
  hasPin: boolean
  ngnBalance: number
}

function Panel({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">{description}</p>
      </div>
      {children}
    </section>
  )
}

export function UserActions({ user }: { user: AdminUserView }) {
  const { toast } = useToast()
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  const [statusReason, setStatusReason] = useState('')
  const [tier, setTier] = useState<number>(user.tier)
  const [tierReason, setTierReason] = useState('')
  const [pinReason, setPinReason] = useState('')
  const [direction, setDirection] = useState<'credit' | 'debit'>('credit')
  const [amount, setAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')

  const isAdminTarget = user.role === 'admin'

  async function run(key: string, fn: () => Promise<AdminResult>, successMsg: string) {
    if (busy) return
    setBusy(key)
    try {
      const result = await fn()
      if (result.ok) {
        toast('Done', successMsg, 'success')
        router.refresh()
      } else {
        toast('Could not complete', result.error ?? 'Please try again.', 'info')
      }
    } catch {
      toast('Could not complete', 'Something went wrong. Try again.', 'info')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Account status */}
      <Panel
        title="Account status"
        description={
          isAdminTarget
            ? 'Admin accounts cannot be frozen.'
            : user.status === 'frozen'
              ? 'This account is frozen and cannot move money. Reactivate to restore access.'
              : 'Freeze this account to immediately block all money movement.'
        }
      >
        {!isAdminTarget && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-2">
              <label htmlFor="status-reason" className="text-sm font-medium text-foreground">
                Reason (optional)
              </label>
              <Input
                id="status-reason"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder={user.status === 'frozen' ? 'Reason for reactivating' : 'Reason for freezing'}
              />
            </div>
            {user.status === 'frozen' ? (
              <Button
                disabled={busy !== null}
                onClick={() =>
                  run(
                    'status',
                    () => setUserStatusAction({ userId: user.id, status: 'active', reason: statusReason }),
                    'Account reactivated.',
                  )
                }
              >
                {busy === 'status' ? 'Working…' : 'Reactivate account'}
              </Button>
            ) : (
              <Button
                variant="destructive"
                disabled={busy !== null}
                onClick={() =>
                  run(
                    'status',
                    () => setUserStatusAction({ userId: user.id, status: 'frozen', reason: statusReason }),
                    'Account frozen.',
                  )
                }
              >
                {busy === 'status' ? 'Working…' : 'Freeze account'}
              </Button>
            )}
          </div>
        )}
      </Panel>

      {/* Verification tier */}
      <Panel
        title="Verification tier"
        description="Override the KYC tier. This changes the user’s limits immediately and notifies them."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-2">
            <label htmlFor="tier-select" className="text-sm font-medium text-foreground">
              Tier
            </label>
            <Select
              id="tier-select"
              value={tier}
              onChange={(e) => setTier(Number(e.target.value))}
              className="sm:w-32"
            >
              <option value={1}>Tier 1</option>
              <option value={2}>Tier 2</option>
              <option value={3}>Tier 3</option>
            </Select>
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <label htmlFor="tier-reason" className="text-sm font-medium text-foreground">
              Reason (optional)
            </label>
            <Input
              id="tier-reason"
              value={tierReason}
              onChange={(e) => setTierReason(e.target.value)}
              placeholder="Reason for tier change"
            />
          </div>
          <Button
            variant="secondary"
            disabled={busy !== null || tier === user.tier}
            onClick={() =>
              run(
                'tier',
                () => setUserTierAction({ userId: user.id, tier, reason: tierReason }),
                `Tier set to Tier ${tier}.`,
              )
            }
          >
            {busy === 'tier' ? 'Working…' : 'Update tier'}
          </Button>
        </div>
      </Panel>

      {/* Manual balance adjustment */}
      <Panel
        title="Manual balance adjustment"
        description={`Credit or debit the NGN wallet. Current balance: ${formatNgn(user.ngnBalance)}. A ledger entry and audit record are written.`}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-col gap-2">
              <label htmlFor="adjust-direction" className="text-sm font-medium text-foreground">
                Direction
              </label>
              <Select
                id="adjust-direction"
                value={direction}
                onChange={(e) => setDirection(e.target.value as 'credit' | 'debit')}
                className="sm:w-36"
              >
                <option value="credit">Credit (+)</option>
                <option value="debit">Debit (−)</option>
              </Select>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <label htmlFor="adjust-amount" className="text-sm font-medium text-foreground">
                Amount (NGN)
              </label>
              <Input
                id="adjust-amount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="font-mono"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="adjust-reason" className="text-sm font-medium text-foreground">
              Reason (required)
            </label>
            <Input
              id="adjust-reason"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="e.g. Refund for failed withdrawal #1234"
            />
          </div>
          <div>
            <Button
              disabled={busy !== null || !amount || Number(amount) <= 0 || adjustReason.trim().length < 3}
              onClick={() =>
                run(
                  'adjust',
                  () =>
                    adjustBalanceAction({
                      userId: user.id,
                      direction,
                      amount: Number(amount),
                      reason: adjustReason,
                    }),
                  `Wallet ${direction === 'credit' ? 'credited' : 'debited'} by ${formatNgn(Number(amount))}.`,
                ).then((r) => {
                  setAmount('')
                  setAdjustReason('')
                  return r
                })
              }
            >
              {busy === 'adjust'
                ? 'Working…'
                : `${direction === 'credit' ? 'Credit' : 'Debit'} wallet`}
            </Button>
          </div>
        </div>
      </Panel>

      {/* Security */}
      <Panel
        title="Security"
        description="Reset the transaction PIN if the user is locked out, or confirm their email manually."
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-2">
              <label htmlFor="pin-reason" className="text-sm font-medium text-foreground">
                PIN reset reason (optional)
              </label>
              <Input
                id="pin-reason"
                value={pinReason}
                onChange={(e) => setPinReason(e.target.value)}
                placeholder="Reason for resetting PIN"
              />
            </div>
            <Button
              variant="secondary"
              disabled={busy !== null || !user.hasPin}
              onClick={() =>
                run(
                  'pin',
                  () => resetUserPinAction({ userId: user.id, reason: pinReason }),
                  'PIN reset. User must set a new one at next sign-in.',
                )
              }
            >
              {busy === 'pin' ? 'Working…' : user.hasPin ? 'Reset PIN' : 'No PIN set'}
            </Button>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
            <div>
              <p className="text-sm font-medium text-foreground">Email verification</p>
              <p className="text-xs text-muted-foreground">
                {user.emailVerified ? 'This email is verified.' : 'This email is not yet verified.'}
              </p>
            </div>
            <Button
              variant="secondary"
              disabled={busy !== null || user.emailVerified}
              onClick={() =>
                run(
                  'email',
                  () => verifyUserEmailAction({ userId: user.id }),
                  'Email marked as verified.',
                )
              }
            >
              {busy === 'email' ? 'Working…' : user.emailVerified ? 'Verified' : 'Mark verified'}
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  )
}
