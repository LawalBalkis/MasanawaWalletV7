import { useCallback } from "react"
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import useSWR from "swr"
import { useWallet } from "../lib/wallet-context"
import { fetchAllBalances, type ChainBalance } from "../lib/chains/balances"
import { CHAINS } from "../lib/chains/config"
import { colors, radius, spacing, type } from "../lib/theme"

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" })
}

function ChainRow({ balance }: { balance: ChainBalance }) {
  const chain = CHAINS.find((c) => c.id === balance.chainId)
  if (!chain) return null
  return (
    <View style={styles.row}>
      <View style={[styles.chainDot, { backgroundColor: chain.color }]} />
      <View style={styles.rowBody}>
        <Text style={type.body}>{chain.name}</Text>
        {balance.error ? (
          <Text style={styles.rowError}>Unavailable</Text>
        ) : (
          <Text style={type.caption}>
            {balance.formatted} {chain.symbol}
          </Text>
        )}
      </View>
      <Text style={[type.body, styles.rowUsd]}>{balance.usd != null ? formatUsd(balance.usd) : "--"}</Text>
    </View>
  )
}

export default function Home() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { addresses, lock, touch } = useWallet()

  const { data, isLoading, isValidating, mutate } = useSWR(
    addresses ? ["balances", addresses.evm, addresses.solana, addresses.tron] : null,
    () => fetchAllBalances(addresses!),
    { refreshInterval: 60_000, revalidateOnFocus: false },
  )

  const onRefresh = useCallback(() => {
    touch()
    mutate()
  }, [mutate, touch])

  const total = data?.reduce((sum, b) => sum + (b.usd ?? 0), 0) ?? null

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
          <Text style={styles.totalValue}>{total != null ? formatUsd(total) : isLoading ? "..." : "--"}</Text>
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
            data?.map((b) => <ChainRow key={b.chainId} balance={b} />)
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
    fontSize: 15,
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
  },
  rowBody: {
    flex: 1,
    gap: 2,
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
