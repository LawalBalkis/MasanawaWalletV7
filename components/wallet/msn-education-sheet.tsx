'use client'

import { useState } from 'react'
import { Info, X } from 'lucide-react'

export function MsnEducationSheet() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <Info className="size-3.5" aria-hidden="true" />
        What is MSN?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold text-foreground">What is MSN?</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">MSN (Masanawa Token)</strong> is the virtual token used inside Masanawa.
                It is always worth ₦1 — no exceptions.
              </p>
              <p>
                When you fund your wallet with naira, you are purchasing MSN at 1:1. When you withdraw, you redeem MSN for naira.
                Your balance is held in MSN, but the app always shows the ₦ equivalent so you know exactly what your money is worth.
              </p>
              <p>
                MSN is not a bank deposit, not e-money, and not an investment. It cannot be sent off-platform and has no market price —
                its only value is its 1:1 redemption right.
              </p>
              <p>
                Use MSN to buy and sell crypto, send money to other users, and trade in the P2P marketplace — all instantly.
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="mt-6 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}
