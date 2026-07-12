import { useCallback } from "react"
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import useSWR from "swr"
import { useWallet } from "../lib/wallet-context"
import { fetchPortfolio } from "../lib/chains/portfolio"
import type { ChainBalance } from "../lib/chains/balances"
import type { TokenBalance } from "../lib/chains/token-balances"
import { CHAINS } from "../lib/chains/config"
import { findToken } from "../lib/chains/tokens"
import { formatFiat } from "../lib/format"
import { colors, radius, spacing, type } from "../lib/theme"

function AssetRow({
  name,
  symbol,
  color,
  formatted,
  fiat,
  currency,
  error,
  badge,
}: {
  name: string
  symbol: string
  color: string
  formatted: string
  fiat: number | null
  currency: string
  error?: string
  badge?: string
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.chainDot, { backgroundColor: color }]}>
        <Text style={styles.dotGlyph}>{symbol.slice(0, 1)}</Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowNameLine}>
          <Text style={type.body}>{name}</Text>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        {error ? (
          <Text style={styles.rowError}>Unavailable</Text>
        ) : (
          <Text style={type.caption}>
            {formatted} {symbol}
          </Text>
        )}
      </View>
      <Text style={[type.body, styles.rowUsd]}>{fiat != null ? formatFiat(fiat, currency) : "--"}</Text>
    </View>
  )
}

export default function Home() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { addresses, settings, lock, touch } = useWallet()
  const currency = settings.currency

  const { data, isLoading, isValidating, mutate } = useSWR(
    addresses ? ["portfolio", addresses.evm, addresses.solana, addresses.tron, currency] : null,
    () => fetchPortfolio(addresses!, currency),
    { refreshInterval: 60_000, revalidateOnFocus: false },
  )

  const onRefresh = useCallback(() => {
    touch()
    mutate()
  }, [mutate, touch])

  const total = data?.total ?? null

  // Only show token rows that either hold a balance or failed to load.
  const visibleTokens = (data?.tokens ?? []).filter(
    (t: TokenBalance) => t.error || (t.raw !== "0" && t.raw.length > 0),
  )

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={type.heading}>Vault Wallet</Text>
        <Pressable onPress={lock} hitSlop={12} accessibilityRole="button" accessibilityLabel="Lock wallet">
          <Text style={styles.lockText}>Lock</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}
        refreshControl={
          <RefreshControl refreshing={isValidating && !isLoading} onRefresh={onRefresh} tintColor={colors.muted} />
        }
        onScrollBeginDrag={touch}
      >
        <View style={styles.totalCard}>
          <Text style={type.caption}>Total balance</Text>
          <Text style={styles.totalValue}>
            {total != null ? formatFiat(total, currency) : isLoading ? "..." : "--"}
          </Text>
          <View style={styles.actionsRow}>
            <Pressable
              onPress={() => {
                touch()
                router.push("/send")
              }}
              accessibilityRole="button"
              accessibilityLabel="Send crypto"
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
              accessibilityLabel="Receive crypto"
              style={({ pressed }) => [styles.action, styles.actionSecondary, pressed && styles.actionPressed]}
            >
              <Text style={[styles.actionText, styles.actionTextSecondary]}>Receive</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                touch()
                router.push("/activity")
              }}
              accessibilityRole="button"
              accessibilityLabel="View activity"
              style={({ pressed }) => [styles.action, styles.actionSecondary, pressed && styles.actionPressed]}
            >
              <Text style={[styles.actionText, styles.actionTextSecondary]}>Activity</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                touch()
                router.push("/settings")
              }}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
              style={({ pressed }) => [styles.action, styles.actionSecondary, pressed && styles.actionPressed]}
            >
              <Text style={[styles.actionText, styles.actionTextSecondary]}>Settings</Text>
            </Pressable>
          </View>
        </View>

        <Text style={[type.heading, styles.sectionTitle]}>Assets</Text>
        <View style={styles.list}>
          {isLoading && !data ? (
            <Text style={[type.caption, styles.loading]}>Loading balances...</Text>
          ) : (
            <>
              {data?.native.map((b: ChainBalance) => {
                const chain = CHAINS.find((c) => c.id === b.chainId)
                if (!chain) return null
                return (
                  <Pressable
                    key={b.chainId}
                    onPress={() => {
                      touch()
                      router.push(`/asset/${b.chainId}`)
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${chain.name}`}
                  >
                    <AssetRow
                      name={chain.name}
                      symbol={chain.symbol}
                      color={chain.color}
                      formatted={b.formatted}
                      fiat={b.usd}
                      currency={currency}
                      error={b.error}
                    />
                  </Pressable>
                )
              })}
              {visibleTokens.map((t: TokenBalance) => {
                const token = findToken(t.tokenId)
                const chain = CHAINS.find((c) => c.id === t.chainId)
                if (!token || !chain) return null
                return (
                  <Pressable
                    key={t.tokenId}
                    onPress={() => {
                      touch()
                      router.push(`/asset/${t.tokenId}`)
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${token.name} on ${chain.name}`}
                  >
                    <AssetRow
                      name={token.name}
                      symbol={token.symbol}
                      color={token.color}
                      formatted={t.formatted}
                      fiat={t.usd}
                      currency={currency}
                      error={t.error}
                      badge={chain.name}
                    />
                  </Pressable>
                )
              })}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    height: 52,
  },
  lockText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  totalCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  totalValue: {
    color: colors.foreground,
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
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
  sectionTitle: {
    marginTop: spacing.sm,
  },
  list: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  chainDot: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  dotGlyph: {
    color: colors.primaryForeground,
    fontSize: 14,
    fontWeight: "700",
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowNameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
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
  rowError: {
    color: colors.danger,
    fontSize: 13,
  },
  rowUsd: {
    fontVariant: ["tabular-nums"],
  },
  loading: {
    paddingVertical: spacing.lg,
    textAlign: "center",
  },
})
