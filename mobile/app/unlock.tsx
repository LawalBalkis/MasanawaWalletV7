import { useCallback, useEffect, useRef, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { Screen } from "../components/screen"
import { Button } from "../components/button"
import { PinPad } from "../components/pin-pad"
import { useWallet } from "../lib/wallet-context"
import { VaultLockedError, WrongPinError } from "../lib/storage/vault"
import { biometricUnlock } from "../lib/storage/biometrics"
import { colors, spacing, type } from "../lib/theme"

function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export default function Unlock() {
  const { unlockWithPin, settings } = useWallet()
  const [error, setError] = useState<string | null>(null)
  const [lockedUntil, setLockedUntil] = useState(0)
  const [now, setNow] = useState(Date.now())
  const [busy, setBusy] = useState(false)
  const [clearSignal, setClearSignal] = useState(0)
  const bioAttempted = useRef(false)

  const throttled = lockedUntil > now

  // Tick while throttled so the countdown updates.
  useEffect(() => {
    if (!throttled) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [throttled])

  const submitPin = useCallback(
    async (pin: string) => {
      setBusy(true)
      setError(null)
      try {
        await unlockWithPin(pin)
        // Gate in _layout routes to /home.
      } catch (e) {
        setClearSignal((n) => n + 1)
        if (e instanceof VaultLockedError) {
          setLockedUntil(e.lockedUntil)
          setNow(Date.now())
          setError(null)
        } else if (e instanceof WrongPinError) {
          setError(`Incorrect PIN (${e.attempts} failed ${e.attempts === 1 ? "attempt" : "attempts"})`)
        } else {
          setError("Something went wrong. Try again.")
        }
      } finally {
        setBusy(false)
      }
    },
    [unlockWithPin],
  )

  const tryBiometrics = useCallback(async () => {
    const pin = await biometricUnlock()
    if (pin) await submitPin(pin)
  }, [submitPin])

  // Auto-prompt biometrics once on mount if enabled.
  useEffect(() => {
    if (settings.biometricsEnabled && !bioAttempted.current) {
      bioAttempted.current = true
      tryBiometrics()
    }
  }, [settings.biometricsEnabled, tryBiometrics])

  return (
    <Screen scroll={false}>
      <View style={styles.top}>
        <Text style={[type.title, styles.centerText]}>Enter PIN</Text>
        {throttled ? (
          <Text style={styles.error}>Too many attempts. Try again in {formatRemaining(lockedUntil - now)}.</Text>
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <Text style={[type.caption, styles.centerText]}>Unlock your wallet</Text>
        )}
      </View>
      <View style={styles.padWrap}>
        <PinPad onComplete={submitPin} clearSignal={clearSignal} disabled={busy || throttled} />
      </View>
      {settings.biometricsEnabled && (
        <Button label="Use biometrics" variant="ghost" onPress={tryBiometrics} disabled={busy || throttled} />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  top: {
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.xxl,
  },
  centerText: {
    textAlign: "center",
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  padWrap: {
    flex: 1,
    justifyContent: "center",
  },
})
