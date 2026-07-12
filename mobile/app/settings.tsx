import { useState } from "react"
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native"
import { Screen } from "../components/screen"
import { Button } from "../components/button"
import { PinPad } from "../components/pin-pad"
import { MnemonicGrid } from "../components/mnemonic-grid"
import { useWallet } from "../lib/wallet-context"
import { unlockVault, VaultLockedError, WrongPinError } from "../lib/storage/vault"
import { biometricsAvailable, enableBiometricUnlock, disableBiometricUnlock } from "../lib/storage/biometrics"
import { colors, radius, spacing, type } from "../lib/theme"

const AUTO_LOCK_OPTIONS = [
  { label: "30s", seconds: 30 },
  { label: "1m", seconds: 60 },
  { label: "5m", seconds: 300 },
  { label: "15m", seconds: 900 },
]

type RevealPhase = "idle" | "pin" | "shown"

export default function Settings() {
  const { settings, updateSettings, resetWallet, touch } = useWallet()
  const [revealPhase, setRevealPhase] = useState<RevealPhase>("idle")
  const [revealedWords, setRevealedWords] = useState<string[]>([])
  const [pinError, setPinError] = useState<string | null>(null)
  const [clearSignal, setClearSignal] = useState(0)
  // PIN-gate for enabling biometrics (we need the PIN to store it behind the OS prompt).
  const [bioPinMode, setBioPinMode] = useState(false)

  async function handleRevealPin(pin: string) {
    touch()
    try {
      const mnemonic = await unlockVault(pin)
      if (bioPinMode) {
        const ok = await enableBiometricUnlock(pin)
        if (ok) await updateSettings({ biometricsEnabled: true })
        else setPinError("Biometric setup failed")
        setBioPinMode(false)
        setRevealPhase("idle")
        return
      }
      setRevealedWords(mnemonic.split(" "))
      setRevealPhase("shown")
      setPinError(null)
    } catch (e) {
      setClearSignal((n) => n + 1)
      if (e instanceof VaultLockedError) setPinError("Too many attempts. Try again later.")
      else if (e instanceof WrongPinError) setPinError("Incorrect PIN")
      else setPinError("Something went wrong")
    }
  }

  function hidePhrase() {
    setRevealedWords([])
    setRevealPhase("idle")
  }

  async function toggleBiometrics(next: boolean) {
    touch()
    if (!next) {
      await disableBiometricUnlock()
      await updateSettings({ biometricsEnabled: false })
      return
    }
    if (!(await biometricsAvailable())) {
      Alert.alert("Unavailable", "No biometrics are enrolled on this device.")
      return
    }
    // Need the PIN to store it behind the biometric-gated keystore entry.
    setBioPinMode(true)
    setPinError(null)
    setClearSignal((n) => n + 1)
    setRevealPhase("pin")
  }

  function confirmReset() {
    Alert.alert(
      "Remove wallet",
      "This deletes your wallet from this device. Without your recovery phrase your funds will be unrecoverable. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove wallet", style: "destructive", onPress: () => resetWallet() },
      ],
    )
  }

  if (revealPhase === "pin") {
    return (
      <Screen title={bioPinMode ? "Confirm PIN" : "Recovery phrase"} scroll={false}>
        <View style={styles.pinTop}>
          <Text style={[type.body, styles.centerText, styles.mutedText]}>
            {bioPinMode ? "Enter your PIN to enable biometric unlock." : "Enter your PIN to reveal your phrase."}
          </Text>
          {pinError && <Text style={styles.error}>{pinError}</Text>}
        </View>
        <View style={styles.padWrap}>
          <PinPad onComplete={handleRevealPin} clearSignal={clearSignal} />
        </View>
        <Button
          label="Cancel"
          variant="ghost"
          onPress={() => {
            setBioPinMode(false)
            setRevealPhase("idle")
            setPinError(null)
          }}
        />
      </Screen>
    )
  }

  if (revealPhase === "shown") {
    return (
      <Screen title="Recovery phrase">
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            Never share these words. Anyone with them can steal your funds.
          </Text>
        </View>
        <MnemonicGrid words={revealedWords} />
        <Button label="Done" onPress={hidePhrase} />
      </Screen>
    )
  }

  return (
    <Screen title="Settings">
      <Text style={[type.caption, styles.sectionLabel]}>SECURITY</Text>
      <View style={styles.group}>
        <View style={styles.item}>
          <View style={styles.itemBody}>
            <Text style={type.body}>Biometric unlock</Text>
            <Text style={type.caption}>Use fingerprint or face to unlock</Text>
          </View>
          <Switch
            value={settings.biometricsEnabled}
            onValueChange={toggleBiometrics}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.foreground}
            accessibilityLabel="Toggle biometric unlock"
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.item}>
          <View style={styles.itemBody}>
            <Text style={type.body}>Auto-lock</Text>
            <Text style={type.caption}>Lock after inactivity</Text>
          </View>
          <View style={styles.segment}>
            {AUTO_LOCK_OPTIONS.map((opt) => {
              const active = settings.autoLockSeconds === opt.seconds
              return (
                <Pressable
                  key={opt.seconds}
                  onPress={() => {
                    touch()
                    updateSettings({ autoLockSeconds: opt.seconds })
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Auto-lock after ${opt.label}`}
                  accessibilityState={{ selected: active }}
                  style={[styles.segmentItem, active && styles.segmentItemActive]}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{opt.label}</Text>
                </Pressable>
              )
            })}
          </View>
        </View>
        <View style={styles.divider} />
        <Pressable
          onPress={() => {
            touch()
            setPinError(null)
            setClearSignal((n) => n + 1)
            setRevealPhase("pin")
          }}
          accessibilityRole="button"
          accessibilityLabel="Reveal recovery phrase"
          style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
        >
          <View style={styles.itemBody}>
            <Text style={type.body}>Reveal recovery phrase</Text>
            <Text style={type.caption}>Requires your PIN</Text>
          </View>
          <Text style={styles.chevron}>{"\u203A"}</Text>
        </Pressable>
      </View>

      <Text style={[type.caption, styles.sectionLabel]}>DANGER ZONE</Text>
      <Button label="Remove wallet from device" variant="danger" onPress={confirmReset} />
      <Text style={type.caption}>
        Removing the wallet deletes the encrypted vault from this device. You can restore it later with your
        recovery phrase.
      </Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  sectionLabel: {
    letterSpacing: 1,
    marginTop: spacing.sm,
  },
  group: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  itemPressed: {
    opacity: 0.7,
  },
  itemBody: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: 2,
    gap: 2,
  },
  segmentItem: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  segmentItemActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: colors.primaryForeground,
  },
  chevron: {
    color: colors.muted,
    fontSize: 24,
  },
  warning: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  warningText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19,
  },
  pinTop: {
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  padWrap: {
    flex: 1,
    justifyContent: "center",
  },
  centerText: {
    textAlign: "center",
  },
  mutedText: {
    color: colors.muted,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
})
