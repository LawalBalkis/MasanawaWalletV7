import { StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { Screen } from "../components/screen"
import { Button } from "../components/button"
import { colors, radius, spacing, type } from "../lib/theme"

export default function Welcome() {
  const router = useRouter()

  return (
    <Screen scroll={false}>
      <View style={styles.hero}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoGlyph}>V</Text>
        </View>
        <Text style={[type.title, styles.centered]}>Vault Wallet</Text>
        <Text style={[type.body, styles.centered, styles.subtitle]}>
          Self-custody wallet for Ethereum, Base, Arbitrum, Optimism, BNB Chain, Solana and TRON. Your keys never
          leave this device.
        </Text>
      </View>
      <View style={styles.actions}>
        <Button label="Create a new wallet" onPress={() => router.push("/create-backup")} />
        <Button label="Import existing wallet" variant="secondary" onPress={() => router.push("/import-wallet")} />
        <Text style={[type.caption, styles.centered]}>
          No accounts. No servers holding your keys. Encrypted on-device with your PIN and hardware keystore.
        </Text>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  logoGlyph: {
    color: colors.primaryForeground,
    fontSize: 36,
    fontWeight: "800",
  },
  centered: {
    textAlign: "center",
  },
  subtitle: {
    color: colors.muted,
  },
  actions: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
})
