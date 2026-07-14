'use client'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { FlowHeader } from '@/components/wallet/flow-header'
import { useToast } from '@/components/wallet/toast'
import { ASSETS, DEPOSIT_ADDRESSES, type AssetSymbol } from '@/lib/wallet/assets'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, TriangleAlert } from 'lucide-react'
import { useState } from 'react'

const CRYPTO_ASSETS = ASSETS.filter((a) => a.symbol !== 'MSN')

type Tab = 'username' | 'crypto'

export function ReceiveClient({ username }: { username: string }) {
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('username')
  const [symbol, setSymbol] = useState<AssetSymbol>('USDT')

  const deposit = DEPOSIT_ADDRESSES[symbol]
  const profileLink = `masanawa.app/@${username}`

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text)
    toast('Copied to clipboard', label)
  }

  return (
    <div className="flex max-w-lg flex-col gap-8">
      <FlowHeader
        title="Receive money"
        description="Share your username for instant wallet-to-wallet transfers, or use a crypto address for on-chain deposits."
      />

      <div
        className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1"
        role="tablist"
        aria-label="Receive method"
      >
        {(
          [
            { id: 'username' as Tab, label: 'Username' },
            { id: 'crypto' as Tab, label: 'Crypto deposit' },
          ]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'username' ? (
        <section className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-card p-6 text-center">
          <div className="rounded-xl bg-white p-4">
            <QRCodeSVG value={`https://${profileLink}`} size={168} aria-hidden="true" />
            <span className="sr-only">QR code linking to your Masanawa profile</span>
          </div>
          <div>
            <p className="font-mono text-lg font-semibold text-primary">@{username}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Anyone on Masanawa can send you naira or crypto with this username. No fees.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => copy(`@${username}`, `@${username}`)}>
              <Copy data-icon="inline-start" aria-hidden="true" />
              Copy username
            </Button>
            <Button variant="secondary" onClick={() => copy(`https://${profileLink}`, profileLink)}>
              Copy profile link
            </Button>
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="receive-asset">Asset</Label>
            <Select
              id="receive-asset"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value as AssetSymbol)}
            >
              {CRYPTO_ASSETS.map((a) => (
                <option key={a.symbol} value={a.symbol}>
                  {a.name} ({a.symbol})
                </option>
              ))}
            </Select>
          </div>

          {deposit && (
            <>
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-xl bg-white p-4">
                  <QRCodeSVG value={deposit.address} size={168} aria-hidden="true" />
                  <span className="sr-only">QR code for your {symbol} deposit address</span>
                </div>
                <div className="w-full">
                  <p className="text-xs text-muted-foreground">
                    Your {symbol} address · {deposit.network}
                  </p>
                  <p className="mt-1 rounded-lg bg-secondary/50 px-3 py-2.5 font-mono text-xs break-all text-foreground">
                    {deposit.address}
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={() => copy(deposit.address, `${symbol} address`)}
                >
                  <Copy data-icon="inline-start" aria-hidden="true" />
                  Copy address
                </Button>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/40 p-4">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <p className="text-xs text-muted-foreground text-pretty">
                  Only send {symbol} on the {deposit.network} network to this address. Deposits on
                  the wrong network can&apos;t be recovered.
                </p>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  )
}
