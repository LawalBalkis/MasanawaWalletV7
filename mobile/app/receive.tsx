import { useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import * as Clipboard from "expo-clipboard"
import QRCode from "react-native-qrcode-svg"
import { Screen } from "../components/screen"
import { Button } from "../components/button"
import { useWallet } from "../lib/wallet-context"
import { colors, radius, spacing, type } from "../lib/theme"

type Network = "evm" | "solana" | "tron"

const NETWORKS: { id: Network; label: string; chains: string }[] = [
  { id: "evm", label: "EVM", chains: "Ethereum, Base, Arbitrum, Optimism, BNB Chain" },
  { id: "solana", label: "Solana", chains: "Solana" },
  { id: "tron", label: "TRON", chains: "TRON" },
]

export default function Receive() {
  const { addresses, touch } = useWallet()
  const [network, setNetwork] = useState<Network>("evm")
  const [copied, setCopied] = useState(false)

  if (!addresses) return null
  const address = addresses[network]
  const meta = NETWORKS.find((n) => n.id === network)!

  async function copy() {
    touch()
    await Clipboard.setStringAsync(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Screen title="Receive">
      <View style={styles.tabs} accessibilityRole="tablist">
        {NETWORKS.map((n) => {
          const active = n.id === network
          return (
            <Pressable
              key={n.id}
              onPress={() => {
                touch()
                setNetwork(n.id)
                setCopied(false)
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{n.label}</Text>
            </Pressable>
          )
        })}
      </View>

      <View style={styles.qrCard}>
        <View style={styles.qrWrap}>
          <QRCode value={address} size={200} backgroundColor="#FFFFFF" color="#000000" />
        </View>
        <Text style={[type.mono, styles.address]} selectable>
          {address}
        </Text>
        <Text style={[type.caption, styles.chainsNote]}>Works on: {meta.chains}</Text>
      </View>

      <Button label={copied ? "Copied" : "Copy address"} variant="secondary" onPress={copy} />
      <Text style={type.caption}>
        Only send {meta.label === "EVM" ? "EVM-network" : meta.label} assets to this address. Assets sent on the
        wrong network may be lost permanently.
      </Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    height: 38,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  tabTextActive: {
    color: colors.primaryForeground,
  },
  qrCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.md,
  },
  qrWrap: {
    backgroundColor: "#FFFFFF",
    padding: spacing.md,
    borderRadius: radius.md,
  },
  address: {
    textAlign: "center",
    paddingHorizontal: spacing.sm,
  },
  chainsNote: {
    textAlign: "center",
  },
})
