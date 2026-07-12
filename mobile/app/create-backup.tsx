import { useMemo, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { Screen } from "../components/screen"
import { Button } from "../components/button"
import { MnemonicGrid } from "../components/mnemonic-grid"
import { createMnemonic } from "../lib/crypto/mnemonic"
import { setPendingMnemonic } from "../lib/onboarding-store"
import { colors, radius, spacing, type } from "../lib/theme"

export default function CreateBackup() {
  const router = useRouter()
  // Generate once per screen mount; kept in memory only.
  const mnemonic = useMemo(() => createMnemonic(), [])
  const words = mnemonic.split(" ")
  const [revealed, setRevealed] = useState(false)

  function next() {
    setPendingMnemonic(mnemonic)
    router.push("/create-verify")
  }

  return (
    <Screen title="Recovery phrase">
      <Text style={type.body}>
        These 12 words are the only way to recover your wallet. Write them down in order and store them somewhere
        safe and offline.
      </Text>
      <View style={styles.warning}>
        <Text style={styles.warningText}>
          Never share your recovery phrase. Anyone with these words can steal your funds. Vault Wallet will never ask
          for them.
        </Text>
      </View>

      {revealed ? (
        <MnemonicGrid words={words} />
      ) : (
        <View style={styles.hidden}>
          <Text style={[type.body, styles.hiddenText]}>Make sure no one is watching your screen.</Text>
          <Button label="Reveal phrase" variant="secondary" onPress={() => setRevealed(true)} />
        </View>
      )}

      <View style={styles.footer}>
        <Button label="I wrote it down" onPress={next} disabled={!revealed} />
        <Text style={type.caption}>Screenshots are discouraged: cloud backups of images can leak your phrase.</Text>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
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
  hidden: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    alignSelf: "stretch",
  },
  hiddenText: {
    color: colors.muted,
    textAlign: "center",
  },
  footer: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
})
