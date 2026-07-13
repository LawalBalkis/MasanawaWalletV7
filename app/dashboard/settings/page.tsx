'use client'

import { Button } from '@/components/ui/button'
import { FlowHeader } from '@/components/wallet/flow-header'
import { PinDialog } from '@/components/wallet/pin-dialog'
import { useToast } from '@/components/wallet/toast'
import { DEMO_BENEFICIARIES, DEMO_USER } from '@/lib/wallet/demo-data'
import { Landmark, Trash2 } from 'lucide-react'
import { useState } from 'react'

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section
      className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6"
      aria-label={title}
    >
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground text-pretty">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}

function Toggle({
  id,
  label,
  detail,
  checked,
  onChange,
}: {
  id: string
  label: string
  detail: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-secondary'
        }`}
      >
        <span className="sr-only">{label}</span>
        <span
          aria-hidden="true"
          className={`absolute top-0.5 size-5 rounded-full bg-background shadow transition-[left] ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  )
}

const inputClass =
  'h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50'

export default function SettingsPage() {
  const { toast } = useToast()

  // Profile
  const [name, setName] = useState(DEMO_USER.name)
  const [email, setEmail] = useState('adaeze@example.com')
  const [phone, setPhone] = useState('+234 803 555 0142')

  // Security
  const [twoFactor, setTwoFactor] = useState(false)
  const [biometrics, setBiometrics] = useState(true)
  const [pinOpen, setPinOpen] = useState(false)

  // Preferences
  const [txAlerts, setTxAlerts] = useState(true)
  const [priceAlerts, setPriceAlerts] = useState(false)
  const [productUpdates, setProductUpdates] = useState(true)

  // Saved accounts
  const [beneficiaries, setBeneficiaries] = useState(DEMO_BENEFICIARIES)

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <FlowHeader
        title="Settings"
        description="Manage your profile, security, and notification preferences."
      />

      <Section
        title="Profile"
        description="Your username is how other Masanawa users find and pay you. It cannot be changed."
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            toast('Profile updated', 'Your profile details were saved.')
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="settings-name" className="text-sm font-medium text-foreground">
                Full name
              </label>
              <input
                id="settings-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="settings-username" className="text-sm font-medium text-foreground">
                Username
              </label>
              <input
                id="settings-username"
                type="text"
                value={`@${DEMO_USER.username}`}
                readOnly
                aria-readonly="true"
                className={`${inputClass} bg-secondary/50 font-mono text-muted-foreground`}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="settings-email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="settings-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="settings-phone" className="text-sm font-medium text-foreground">
                Phone
              </label>
              <input
                id="settings-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>
          <div>
            <Button type="submit">Save changes</Button>
          </div>
        </form>
      </Section>

      <Section
        title="Security"
        description="Protect your wallet with extra layers of verification."
      >
        <div className="flex flex-col gap-5">
          <Toggle
            id="settings-2fa"
            label="Two-factor authentication"
            detail="Require a one-time code when signing in on a new device."
            checked={twoFactor}
            onChange={(v) => {
              setTwoFactor(v)
              toast(
                v ? 'Two-factor enabled' : 'Two-factor disabled',
                v
                  ? 'You will be asked for a code on new sign-ins.'
                  : 'Sign-ins no longer require a code.',
                v ? 'success' : 'info',
              )
            }}
          />
          <Toggle
            id="settings-biometrics"
            label="Biometric unlock"
            detail="Use fingerprint or face unlock on supported devices."
            checked={biometrics}
            onChange={setBiometrics}
          />
          <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
            <div>
              <p className="text-sm font-medium text-foreground">Transaction PIN</p>
              <p className="text-xs text-muted-foreground">
                The 4-digit PIN that authorizes sends, trades, and withdrawals.
              </p>
            </div>
            <Button variant="secondary" onClick={() => setPinOpen(true)}>
              Change PIN
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Notifications" description="Choose what Masanawa alerts you about.">
        <div className="flex flex-col gap-5">
          <Toggle
            id="settings-tx-alerts"
            label="Transaction alerts"
            detail="Get notified for every payment in or out of your wallet."
            checked={txAlerts}
            onChange={setTxAlerts}
          />
          <Toggle
            id="settings-price-alerts"
            label="Price alerts"
            detail="Big moves on assets you hold, like BTC and ETH."
            checked={priceAlerts}
            onChange={setPriceAlerts}
          />
          <Toggle
            id="settings-product-updates"
            label="Product updates"
            detail="New features and occasional tips. Never spam."
            checked={productUpdates}
            onChange={setProductUpdates}
          />
        </div>
      </Section>

      <Section
        title="Saved bank accounts"
        description="Accounts you can withdraw to in one tap."
      >
        {beneficiaries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No saved accounts yet. Add one during your next withdrawal.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {beneficiaries.map((ben) => (
              <li key={ben.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                    <Landmark className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{ben.bank}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      ••{ben.accountNumber.slice(-4)} · {ben.accountName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBeneficiaries((prev) => prev.filter((b) => b.id !== ben.id))
                    toast('Account removed', `${ben.bank} ••${ben.accountNumber.slice(-4)} removed.`, 'info')
                  }}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                  aria-label={`Remove ${ben.bank} account ending ${ben.accountNumber.slice(-4)}`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <PinDialog
        open={pinOpen}
        title="Verify your current PIN"
        description="Enter your current 4-digit PIN before choosing a new one."
        onConfirm={() => {
          setPinOpen(false)
          toast('PIN verified', 'You can now set a new transaction PIN.', 'info')
        }}
        onCancel={() => setPinOpen(false)}
      />
    </div>
  )
}
