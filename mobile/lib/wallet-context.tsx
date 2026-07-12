"use client"

/**
 * Wallet session state. Holds ONLY public data in memory (addresses,
 * settings, lock status). The mnemonic is decrypted transiently inside
 * vault functions and never stored here.
 *
 * Auto-lock: locks when the app backgrounds, and after `autoLockSeconds`
 * of inactivity in the foreground.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { AppState, type AppStateStatus } from "react-native"
import type { WalletAddresses } from "./crypto/derivation"
import {
  vaultExists,
  getStoredAddresses,
  getSettings,
  setSettings as persistSettings,
  destroyVault,
  unlockVault,
  type WalletSettings,
} from "./storage/vault"
import { disableBiometricUnlock } from "./storage/biometrics"

type WalletStatus = "loading" | "no-wallet" | "locked" | "unlocked"

interface WalletContextValue {
  status: WalletStatus
  addresses: WalletAddresses | null
  settings: WalletSettings
  /** Called after successful vault creation (already unlocked). */
  onWalletCreated: (addresses: WalletAddresses) => void
  /** Verify PIN via vault decryption; unlocks the session on success. */
  unlockWithPin: (pin: string) => Promise<void>
  lock: () => void
  resetWallet: () => Promise<void>
  updateSettings: (patch: Partial<WalletSettings>) => Promise<void>
  /** Bump the inactivity timer (call on user interaction). */
  touch: () => void
}

const DEFAULT_SETTINGS: WalletSettings = { biometricsEnabled: false, autoLockSeconds: 60, currency: "usd" }

const WalletContext = createContext<WalletContextValue | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WalletStatus>("loading")
  const [addresses, setAddresses] = useState<WalletAddresses | null>(null)
  const [settings, setSettings] = useState<WalletSettings>(DEFAULT_SETTINGS)
  const lastActivityRef = useRef(Date.now())
  const statusRef = useRef<WalletStatus>("loading")
  statusRef.current = status

  // Initial load
  useEffect(() => {
    let cancelled = false
    async function init() {
      const [exists, storedAddresses, storedSettings] = await Promise.all([
        vaultExists(),
        getStoredAddresses(),
        getSettings(),
      ])
      if (cancelled) return
      setSettings(storedSettings)
      if (!exists) {
        setStatus("no-wallet")
      } else {
        setAddresses(storedAddresses)
        setStatus("locked")
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  const lock = useCallback(() => {
    if (statusRef.current === "unlocked") setStatus("locked")
  }, [])

  // Lock on background
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "background" || next === "inactive") lock()
    })
    return () => sub.remove()
  }, [lock])

  // Inactivity auto-lock
  useEffect(() => {
    if (status !== "unlocked") return
    const interval = setInterval(() => {
      if (Date.now() - lastActivityRef.current > settings.autoLockSeconds * 1000) lock()
    }, 5000)
    return () => clearInterval(interval)
  }, [status, settings.autoLockSeconds, lock])

  const touch = useCallback(() => {
    lastActivityRef.current = Date.now()
  }, [])

  const onWalletCreated = useCallback((addrs: WalletAddresses) => {
    setAddresses(addrs)
    lastActivityRef.current = Date.now()
    setStatus("unlocked")
  }, [])

  const unlockWithPin = useCallback(async (pin: string) => {
    // Throws WrongPinError / VaultLockedError on failure.
    const mnemonic = await unlockVault(pin)
    // We only needed to prove the PIN is correct; drop the mnemonic immediately.
    void mnemonic
    const addrs = await getStoredAddresses()
    setAddresses(addrs)
    lastActivityRef.current = Date.now()
    setStatus("unlocked")
  }, [])

  const resetWallet = useCallback(async () => {
    await disableBiometricUnlock()
    await destroyVault()
    setAddresses(null)
    setStatus("no-wallet")
    setSettings(DEFAULT_SETTINGS)
  }, [])

  const updateSettings = useCallback(
    async (patch: Partial<WalletSettings>) => {
      const next = { ...settings, ...patch }
      setSettings(next)
      await persistSettings(next)
    },
    [settings],
  )

  const value = useMemo(
    () => ({
      status,
      addresses,
      settings,
      onWalletCreated,
      unlockWithPin,
      lock,
      resetWallet,
      updateSettings,
      touch,
    }),
    [status, addresses, settings, onWalletCreated, unlockWithPin, lock, resetWallet, updateSettings, touch],
  )

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error("useWallet must be used within WalletProvider")
  return ctx
}
