'use client'

import { reassignFundingAction, refundFundingAction } from '@/lib/wallet/admin-actions'
import { useState, useTransition } from 'react'

export interface FundingRow {
  transactionRef: string
  payerName: string
  amount: number
  userId: string | null
}

export interface UserOption {
  id: string
  label: string
}

export function FundingsClient({
  fundings,
  userOptions,
}: {
  fundings: FundingRow[]
  userOptions: UserOption[]
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [assignRef, setAssignRef] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState('')

  const unmatched = fundings.filter((f) => !f.userId)

  function handleReassign() {
    if (!assignRef || !selectedUser) return
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await reassignFundingAction({ transactionRef: assignRef, userId: selectedUser })
      if (result.ok) {
        setSuccess(`Funding ${assignRef.slice(0, 16)}… reassigned.`)
        setAssignRef(null)
        setSelectedUser('')
      } else {
        setError(result.error ?? 'Failed to reassign.')
      }
    })
  }

  function handleRefund(ref: string) {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await refundFundingAction({ transactionRef: ref })
      if (result.ok) setSuccess(`Funding ${ref.slice(0, 16)}… marked as refunded.`)
      else setError(result.error ?? 'Failed to refund.')
    })
  }

  if (unmatched.length === 0) return null

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Reconciliation</h2>

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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Payer</th>
              <th className="px-5 py-3 font-medium">Reference</th>
              <th className="px-5 py-3 text-right font-medium">Amount</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {unmatched.map((f) => (
              <tr key={f.transactionRef} className="border-b border-border last:border-b-0">
                <td className="px-5 py-3">{f.payerName}</td>
                <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{f.transactionRef}</td>
                <td className="px-5 py-3 text-right font-mono">₦{f.amount.toLocaleString()}</td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-2">
                    {assignRef === f.transactionRef ? (
                      <>
                        <select
                          value={selectedUser}
                          onChange={(e) => setSelectedUser(e.target.value)}
                          className="rounded-md border border-border bg-card px-2 py-1 text-xs"
                        >
                          <option value="">Select user…</option>
                          {userOptions.map((u) => (
                            <option key={u.id} value={u.id}>{u.label}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleReassign}
                          disabled={pending || !selectedUser}
                          className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-60"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setAssignRef(null)}
                          className="rounded-md border border-border px-3 py-1 text-xs"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setAssignRef(f.transactionRef)}
                          disabled={pending}
                          className="rounded-md border border-border px-3 py-1 text-xs font-medium hover:bg-secondary disabled:opacity-60"
                        >
                          Reassign
                        </button>
                        <button
                          onClick={() => handleRefund(f.transactionRef)}
                          disabled={pending}
                          className="rounded-md border border-destructive/20 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/5 disabled:opacity-60"
                        >
                          Refund
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
    </section>
  )
}
