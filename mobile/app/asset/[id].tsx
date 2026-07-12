import { useMemo } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import useSWR from "swr"
import { Screen } from "../../components/screen"
import { ActivityList } from "../../components/activity-list"
import { useWallet } from "../../lib/wallet-context"
import { useActivity } from "../../lib/use-activity"
import { fetchPortfolio } from "../../lib/chains/portfolio"
import { CHAINS } from "../../lib/chains/config"
import { findToken } from "../../lib/chains/tokens"
import { formatFiat, formatPrice } from "../../lib/format"
import { colors, radius, spacing, type } from "../../lib/theme"

export default function AssetDetail() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { addresses, settings, touch } = useWallet()
  const currency = settings.currency

  // Token ids look like "chain:SYMBOL"; chain ids have no colon.
  const token = id ? findToken(id) : undefined
  const chain = CHAINS.find((c) => c.id === (token ? token.chainId : id))

  // Shares the SWR cache key with the home screen.
  const { data } = useSWR(
    addresses ? ["portfolio", addresses.evm, addresses.solana, addresses.tron, currency] : null,
    () => fetchPortfolio(addresses!, currency),
    { revalidateOnFocus: false },
  )

  const { entries } = useActivity()
  const assetEntries = useMemo(
    () => entries.filter((e) => (token ? e.tokenId === token.id : e.chainId === id && !e.tokenId)),
    [entries, token, id],
  )

  if (!id || !chain || !addresses) {
    return (
      <Screen title="Asset">
        <Text style={type.caption}>Asset not found.</Text>
      </Screen>
    )
  }

  const balance = token
    ? data?.tokens.find((t) => t.tokenId === token.id)
    : data?.native.find((b) => b.chainId === chain.id)
  const symbol = token ? token.symbol : chain.symbol
  const name = token ? token.name : chain.name
  const color = token ? token.color : chain.color

  const amountNum = balance && !balance.error ? Number.parseFloat(balance.formatted) : null
  const unitPrice = balance?.usd != null && amountNum != null && amountNum > 0 ? balance.usd / amountNum : null

  return (
    <Screen title={name}>
      <View style={styles.card}>
        <View style={[styles.dot, { backgroundColor: color }]}>
          <Text style={styles.dotGlyph}>{symbol.slice(0, 1)}</Text>
        </View>
        {balance?.error ? (
          <Text style={styles.errorText}>Balance unavailable</Text>
        ) : (
          <>
            <Text style={styles.balanceValue}>
              {balance ? balance.formatted : "..."} {symbol}
            </Text>
            <Text style={type.caption}>
              {balance?.usd != null ? formatFiat(balance.usd, currency) : "--"}
              {unitPrice != null ? `  \u00B7  ${formatPrice(unitPrice, currency)} / ${symbol}` : ""}
            </Text>
          </>
        )}
        {token ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{chain.name}</Text>
          </View>
        ) : null}
        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => {
              touch()
              router.push({ pathname: "/send", params: { asset: id } })
            }}
            accessibilityRole="button"
            accessibilityLabel={`Send ${symbol}`}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          >
            <Text style={styles.actionText}>Send</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              touch()
              router.push("/receive")
            }}
            accessibilityRole="button"
            accessibilityLabel={`Receive ${symbol}`}
            style={({ pressed }) => [styles.action, styles.actionSecondary, pressed && styles.actionPressed]}
          >
            <Text style={[styles.actionText, styles.actionTextSecondary]}>Receive</Text>
          </Pressable>
        </View>
      </View>

      <Text style={[type.heading, styles.sectionTitle]}>Activity</Text>
      <ActivityList entries={assetEntries} emptyText={`No ${symbol} transactions yet`} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  dot: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  dotGlyph: {
    color: colors.primaryForeground,
    fontSize: 20,
    fontWeight: "700",
  },
  balanceValue: {
    color: colors.foreground,
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
    alignSelf: "stretch",
  },
  action: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  actionSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionPressed: {
    opacity: 0.8,
  },
  actionText: {
    color: colors.primaryForeground,
    fontSize: 14,
    fontWeight: "600",
  },
  actionTextSecondary: {
    color: colors.foreground,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
  sectionTitle: {
    marginTop: spacing.sm,
  },
})
