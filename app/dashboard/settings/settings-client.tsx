'use client'

import { Button } from '@/components/ui/button'
import { FlowHeader } from '@/components/wallet/flow-header'
import { PinDialog } from '@/components/wallet/pin-dialog'
import { TierUpgradeDialog, type TierUpgradeSubmit } from '@/components/wallet/tier-upgrade-dialog'
import { useToast } from '@/components/wallet/toast'
import {
  changePinAction,
  removeBeneficiaryAction,
  setPreferenceAction,
  submitTierUpgradeAction,
  updateProfileAction,
} from '@/lib/wallet/account-actions'
import type { Beneficiary } from '@/lib/wallet/assets'
import { VERIFICATION_TIERS, formatLimit, type TierId } from '@/lib/wallet/tiers'
import { useRouter } from 'next/navigation'
import { BadgeCheck, Landmark, Trash2 } from 'lucide-react'
import { useState, useTransition } from 'react'

export interface SettingsUser {
  name: string
  username: string
  email: string
  phone: string
  tier: TierId
  notifyTransactions: boolean
  notifyPrices: boolean
  notifyProduct: boolean
  twoFactor: boolean
  biometric: boolean
}

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

function VerificationTierSection({
  currentTierId,
  onUpgrade,
}: {
  currentTierId: TierId
  onUpgrade: (target: 2 | 3) => void
}) {
  const tiers = Object.values(VERIFICATION_TIERS)

  return (
    <Section
      title="Verification tier"
      description="Your tier sets your withdrawal limits and what you can do with your wallet. Upgrade by completing extra verification."
    >
      <div className="flex flex-col gap-3">
        {tiers.map((tier) => {
          const isCurrent = tier.id === currentTierId
          const isNext = tier.id === currentTierId + 1
          return (
            <div
              key={tier.id}
              className={`flex flex-col gap-3 rounded-xl border p-4 ${
                isCurrent ? 'border-primary bg-accent/40' : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    {tier.name}
                    {isCurrent && <BadgeCheck className="size-4 text-primary" aria-hidden="true" />}
                  </p>
                  <p className="text-xs text-muted-foreground">{tier.requirement}</p>
                </div>
                {isCurrent ? (
                  <span className="shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                    Current
                  </span>
                ) : isNext ? (
                  <Button size="sm" variant="secondary" onClick={() => onUpgrade(tier.id as 2 | 3)}>
                    Upgrade
                  </Button>
                ) : null}
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">Per withdrawal</dt>
                  <dd className="font-mono font-medium text-foreground">
                    {formatLimit(tier.singleWithdrawalNgn)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Daily bank</dt>
                  <dd className="font-mono font-medium text-foreground">
                    {formatLimit(tier.dailyWithdrawalNgn)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Daily crypto</dt>
                  <dd className="font-mono font-medium text-foreground">
                    {formatLimit(tier.dailyCryptoWithdrawalNgn)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Max balance</dt>
                  <dd className="font-mono font-medium text-foreground">
                    {formatLimit(tier.maxBalanceNgn)}
                  </dd>
                </div>
              </dl>
              <p className="text-xs text-muted-foreground">
                {tier.capabilities.withdrawCrypto
                  ? 'Includes crypto withdrawals to external wallets.'
                  : 'Crypto withdrawals not available on this tier.'}
              </p>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

const inputClass =
  'h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50'

type PinStep = 'current' | 'new' | 'confirm' | null

export function SettingsClient({
  user,
  beneficiaries: initialBeneficiaries,
}: {
  user: SettingsUser
  beneficiaries: Beneficiary[]
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [, startTransition] = useTransition()

  // Verification tier upgrade
  const [upgradeTarget, setUpgradeTarget] = useState<2 | 3 | null>(null)

  // Profile
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [phone, setPhone] = useState(user.phone)
  const [savingProfile, setSavingProfile] = useState(false)

  // Security & notification prefs
  const [twoFactor, setTwoFactor] = useState(user.twoFactor)
  const [biometrics, setBiometrics] = useState(user.biometric)
  const [txAlerts, setTxAlerts] = useState(user.notifyTransactions)
  const [priceAlerts, setPriceAlerts] = useState(user.notifyPrices)
  const [productUpdates, setProductUpdates] = useState(user.notifyProduct)

  // PIN change
  const [pinStep, setPinStep] = useState<PinStep>(null)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')

  // Saved accounts
  const [beneficiaries, setBeneficiaries] = useState(initialBeneficiaries)

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    const result = await updateProfileAction({ name, email, phone })
    setSavingProfile(false)
    if (result.ok) {
      toast('Profile updated', 'Your profile details were saved.')
    } else {
      toast('Could not save', result.error ?? 'Please check your details.', 'info')
    }
  }

  function togglePref(
    key: 'notifyTransactions' | 'notifyPrices' | 'notifyProduct' | 'twoFactor' | 'biometric',
    value: boolean,
    apply: (v: boolean) => void,
    messages?: { on?: [string, string]; off?: [string, string] },
  ) {
    apply(value)
    startTransition(() => {
      void setPreferenceAction(key, value)
    })
    if (messages) {
      const pair = value ? messages.on : messages.off
      if (pair) toast(pair[0], pair[1], value ? 'success' : 'info')
    }
  }

  function removeBeneficiary(ben: Beneficiary) {
    setBeneficiaries((prev) => prev.filter((b) => b.id !== ben.id))
    startTransition(() => {
      void removeBeneficiaryAction(ben.id)
    })
    toast('Account removed', `${ben.bank} ••${ben.accountNumber.slice(-4)} removed.`, 'info')
  }

  async function handlePinConfirm(pin: string): Promise<{ ok: boolean; error?: string }> {
    if (pinStep === 'current') {
      setCurrentPin(pin)
      setPinStep('new')
      return { ok: true }
    }
    if (pinStep === 'new') {
      setNewPin(pin)
      setPinStep('confirm')
      return { ok: true }
    }
    // confirm
    const result = await changePinAction({ currentPin, newPin, confirmPin: pin })
    if (result.ok) {
      setPinStep(null)
      setCurrentPin('')
      setNewPin('')
      toast('PIN updated', 'Your transaction PIN was changed.', 'success')
    }
    return result
  }

  async function handleTierUpgrade(data: TierUpgradeSubmit) {
    const result = await submitTierUpgradeAction(data)
    if (result.ok) {
      setUpgradeTarget(null)
      const name = VERIFICATION_TIERS[data.targetTier as TierId].name
      toast('Verification upgraded', `Your account is now ${name}. New limits are active.`, 'success')
      router.refresh()
    }
    return result
  }

  const currentTier = VERIFICATION_TIERS[user.tier]

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
        <form className="flex flex-col gap-4" onSubmit={saveProfile}>
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
                value={`@${user.username}`}
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
                placeholder="+234 ..."
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>
          <div>
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Section>

      <VerificationTierSection currentTierId={currentTier.id} onUpgrade={setUpgradeTarget} />

      <Section title="Security" description="Protect your wallet with extra layers of verification.">
        <div className="flex flex-col gap-5">
          <Toggle
            id="settings-2fa"
            label="Two-factor authentication"
            detail="Require a one-time code when signing in on a new device."
            checked={twoFactor}
            onChange={(v) =>
              togglePref('twoFactor', v, setTwoFactor, {
                on: ['Two-factor enabled', 'You will be asked for a code on new sign-ins.'],
                off: ['Two-factor disabled', 'Sign-ins no longer require a code.'],
              })
            }
          />
          <Toggle
            id="settings-biometrics"
            label="Biometric unlock"
            detail="Use fingerprint or face unlock on supported devices."
            checked={biometrics}
            onChange={(v) => togglePref('biometric', v, setBiometrics)}
          />
          <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
            <div>
              <p className="text-sm font-medium text-foreground">Transaction PIN</p>
              <p className="text-xs text-muted-foreground">
                The 4-digit PIN that authorizes sends, trades, and withdrawals.
              </p>
            </div>
            <Button variant="secondary" onClick={() => setPinStep('current')}>
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
            onChange={(v) => togglePref('notifyTransactions', v, setTxAlerts)}
          />
          <Toggle
            id="settings-price-alerts"
            label="Price alerts"
            detail="Big moves on assets you hold, like BTC and ETH."
            checked={priceAlerts}
            onChange={(v) => togglePref('notifyPrices', v, setPriceAlerts)}
          />
          <Toggle
            id="settings-product-updates"
            label="Product updates"
            detail="New features and occasional tips. Never spam."
            checked={productUpdates}
            onChange={(v) => togglePref('notifyProduct', v, setProductUpdates)}
          />
        </div>
      </Section>

      <Section title="Saved bank accounts" description="Accounts you can withdraw to in one tap.">
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
                  onClick={() => removeBeneficiary(ben)}
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

      <TierUpgradeDialog
        open={upgradeTarget !== null}
        targetTier={(upgradeTarget ?? 2) as 2 | 3}
        tierName={VERIFICATION_TIERS[(upgradeTarget ?? 2) as TierId].name}
        onSubmit={handleTierUpgrade}
        onCancel={() => setUpgradeTarget(null)}
      />

      <PinDialog
        open={pinStep !== null}
        title={
          pinStep === 'current'
            ? 'Verify your current PIN'
            : pinStep === 'new'
              ? 'Choose a new PIN'
              : 'Confirm your new PIN'
        }
        description={
          pinStep === 'current'
            ? 'Enter your current 4-digit PIN to continue.'
            : pinStep === 'new'
              ? 'Enter a new 4-digit transaction PIN.'
              : 'Re-enter your new PIN to confirm the change.'
        }
        onConfirm={handlePinConfirm}
        onCancel={() => {
          setPinStep(null)
          setCurrentPin('')
          setNewPin('')
        }}
      />
    </div>
  )
}
