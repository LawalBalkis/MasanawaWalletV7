import { StyleSheet, Text, View } from "react-native"
import { colors, radius, spacing } from "../lib/theme"

/** Read-only numbered 12-word grid for backup display. */
export function MnemonicGrid({ words }: { words: string[] }) {
  return (
    <View style={styles.grid}>
      {words.map((word, i) => (
        <View key={i} style={styles.cell}>
          <Text style={styles.index}>{i + 1}</Text>
          <Text style={styles.word}>{word}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  cell: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    width: "31%",
    flexGrow: 1,
  },
  index: {
    color: colors.muted,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    minWidth: 16,
  },
  word: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "500",
  },
})
