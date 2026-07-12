import { Linking, Pressable, StyleSheet, Text, View } from "react-native"
import { CHAINS } from "../lib/chains/config"
import type { ActivityEntry, ActivityStatus } from "../lib/storage/activity"
import { colors, radius, spacing, type } from "../lib/theme"

function shorten(address: string): string {
  return address.length > 14 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address
}

function formatWhen(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  if (sameDay) return time
  return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${time}`
}

const STATUS_META: Record<ActivityStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: colors.muted },
  confirmed: { label: "Confirmed", color: colors.primary },
  failed: { label: "Failed", color: colors.danger },
}

function StatusBadge({ status }: { status: ActivityStatus }) {
  const meta = STATUS_META[status]
  return (
    <View style={[styles.badge, { borderColor: meta.color }]}>
      <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  )
}

export function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const chain = CHAINS.find((c) => c.id === entry.chainId)
  const openExplorer = () => {
    if (chain) Linking.openURL(chain.explorerTx + entry.hash)
  }
  return (
    <Pressable
      onPress={openExplorer}
      accessibilityRole="button"
      accessibilityLabel={`View transaction of ${entry.formatted} ${entry.symbol} on explorer`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.iconDot, { backgroundColor: chain?.color ?? colors.border }]}>
        <Text style={styles.iconGlyph}>{"\u2191"}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.line}>
          <Text style={type.body}>Sent {entry.symbol}</Text>
          <Text style={[type.body, styles.amount]}>
            -{entry.formatted} {entry.symbol}
          </Text>
        </View>
        <View style={styles.line}>
          <Text style={type.caption}>
            To {shorten(entry.to)}
            {chain ? ` \u00B7 ${chain.name}` : ""}
          </Text>
          <Text style={type.caption}>{formatWhen(entry.timestamp)}</Text>
        </View>
      </View>
      <StatusBadge status={entry.status} />
    </Pressable>
  )
}

export function ActivityList({ entries, emptyText }: { entries: ActivityEntry[]; emptyText?: string }) {
  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[type.caption, styles.emptyText]}>{emptyText ?? "No transactions yet"}</Text>
      </View>
    )
  }
  return (
    <View style={styles.list}>
      {entries.map((entry) => (
        <ActivityRow key={entry.id} entry={entry} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
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
  rowPressed: {
    opacity: 0.7,
  },
  iconDot: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  iconGlyph: {
    color: colors.primaryForeground,
    fontSize: 16,
    fontWeight: "700",
  },
  body: {
    flex: 1,
    gap: 2,
  },
  line: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  amount: {
    fontVariant: ["tabular-nums"],
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  empty: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    textAlign: "center",
  },
})
