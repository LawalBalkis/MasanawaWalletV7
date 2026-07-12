import { useCallback, useEffect, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { Screen } from "../components/screen"
import { Button } from "../components/button"
import { PinPad } from "../components/pin-pad"
import { useWallet } from "../lib/wallet-context"
import { createVault } from "../lib/storage/vault"
import { biometricsAvailable, enableBiometricUnlock } from "../lib/storage/biometrics"
import { getPendingMnemonic, clearPendingMnemonic } from "../lib/onboarding-store"
import { colors, spacing, type } from "../lib/theme"

type Phase = "enter" | "confirm" | "creating" | "biometrics"

export default function SetPin() {
  const router = useRouter()
  const { onWalletCreated, updateSettings } = useWallet()
  const [phase, setPhase] = useState<Phase>("enter")
  const [firstPin, setFirstPin] = useState("")
  const [confirmedPin, setConfirmedPin] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [clearSignal, setClearSignal] = useState(0)
  const [bioAvailable, setBioAvailable] = useState(false)
  const [bioBusy, setBioBusy] = useState(false)

  useEffect(() => {
    biometricsAvailable().then(setBioAvailable)
  }, [])

  const finish = useCallback(async () => {
    const mnemonic = getPendingMnemonic()
    if (!mnemonic) return
    clearPendingMnemonic()
    const addresses = await createVault(mnemonic, confirmedPin)
    setConfirmedPin("")
    onWalletCreated(addresses)
    // Gate in _layout routes to /home once status flips to unlocked.
  }, [confirmedPin, onWalletCreated])

  const handlePin = useCallback(
    async (pin: string) => {
      setError(null)
      if (phase === "enter") {
        setFirstPin(pin)
        setPhase("confirm")
        setClearSignal((n) => n + 1)
        return
      }
      if (phase === "confirm") {
        if (pin !== firstPin) {
          setError("PINs don't match. Try again.")
          setPhase("enter")
          setFirstPin("")
          setClearSignal((n) => n + 1)
          return
        }
        setFirstPin("")
        setConfirmedPin(pin)
        if (bioAvailable) {
          setPhase("biometrics")
        } else {
          setPhase("creating")
        }
      }
    },
    [phase, firstPin, bioAvailable],
  )

  // Create the vault once we reach the creating phase without biometrics.
  useEffect(() => {
    if (phase !== "creating") return
    finish().catch(() => {
      setError("Failed to create wallet. Please try again.")
      setPhase("enter")
      setClearSignal((n) => n + 1)
    })
  }, [phase, finish])

  async function chooseBiometrics(enable: boolean) {
    setBioBusy(true)
    try {
      if (enable) {
        const ok = await enableBiometricUnlock(confirmedPin)
        if (ok) await updateSettings({ biometricsEnabled: true })
      }
      await finish()
    } catch {
      setError("Failed to create wallet. Please try again.")
      setPhase("enter")
      setClearSignal((n) => n + 1)
    } finally {
      setBioBusy(false)
    }
  }

  // Flow entered without a pending mnemonic (e.g. app reloaded): restart.
  if (!getPendingMnemonic() && phase !== "creating" && phase !== "biometrics") {
    return (
      <Screen title="Set PIN">
        <Text style={type.body}>This session expired. Start over to continue.</Text>
        <Button label="Start over" onPress={() => router.replace("/welcome")} />
      </Screen>
    )
  }

  if (phase === "biometrics") {
    return (
      <Screen title="Biometric unlock" back={false}>
        <View style={styles.center}>
          <Text style={[type.title, styles.centerText]}>Enable biometrics?</Text>
          <Text style={[type.body, styles.centerText, styles.muted]}>
            Unlock your wallet with your fingerprint or face instead of typing your PIN. Your PIN always remains
            available as a fallback.
          </Text>
        </View>
        <View style={styles.actions}>
          <Button label="Enable biometrics" onPress={() => chooseBiometrics(true)} loading={bioBusy} />
          <Button label="Not now" variant="ghost" onPress={() => chooseBiometrics(false)} disabled={bioBusy} />
        </View>
      </Screen>
    )
  }

  return (
    <Screen title={phase === "confirm" ? "Confirm PIN" : "Set PIN"} scroll={false}>
      <View style={styles.top}>
        <Text style={[type.body, styles.centerText, styles.muted]}>
          {phase === "confirm"
            ? "Enter the same 6-digit PIN again."
            : "This PIN encrypts your wallet on this device. You'll need it to unlock and send."}
        </Text>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
      <View style={styles.padWrap}>
        <PinPad onComplete={handlePin} clearSignal={clearSignal} disabled={phase === "creating"} />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  top: {
    gap: spacing.sm,
    alignItems: "center",
    paddingTop: spacing.md,
  },
  padWrap: {
    flex: 1,
    justifyContent: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  centerText: {
    textAlign: "center",
  },
  muted: {
    color: colors.muted,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  actions: {
    gap: spacing.sm,
  },
})
