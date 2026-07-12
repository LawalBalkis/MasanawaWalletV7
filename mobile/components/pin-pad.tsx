import { useCallback, useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { colors, radius, spacing } from "../lib/theme"

export const PIN_LENGTH = 6

interface PinPadProps {
  /** Called when PIN_LENGTH digits have been entered. Return value ignored. */
  onComplete: (pin: string) => void
  /** Increment to clear the entered digits (e.g. after a wrong PIN). */
  clearSignal?: number
  disabled?: boolean
}

/** 6-digit PIN entry: dot indicator + numeric pad. */
export function PinPad({ onComplete, clearSignal = 0, disabled }: PinPadProps) {
  const [digits, setDigits] = useState("")

  useEffect(() => {
    setDigits("")
  }, [clearSignal])

  const press = useCallback(
    (d: string) => {
      if (disabled) return
      setDigits((prev) => {
        if (prev.length >= PIN_LENGTH) return prev
        const next = prev + d
        if (next.length === PIN_LENGTH) {
          // Defer so the last dot renders before any heavy work.
          setTimeout(() => onComplete(next), 50)
        }
        return next
      })
    },
    [disabled, onComplete],
  )

  const backspace = useCallback(() => {
    if (disabled) return
    setDigits((prev) => prev.slice(0, -1))
  }, [disabled])

  const rows = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["", "0", "back"],
  ]

  return (
    <View style={styles.root}>
      <View style={styles.dots} accessibilityLabel={`${digits.length} of ${PIN_LENGTH} digits entered`}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View key={i} style={[styles.dot, i < digits.length && styles.dotFilled]} />
        ))}
      </View>
      <View style={styles.pad}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((key, ki) => {
              if (key === "") return <View key={ki} style={styles.key} />
              const isBack = key === "back"
              return (
                <Pressable
                  key={ki}
                  onPress={isBack ? backspace : () => press(key)}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel={isBack ? "Delete digit" : key}
                  style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
                >
                  <Text style={styles.keyLabel}>{isBack ? "\u232B" : key}</Text>
                </Pressable>
              )
            })}
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    gap: spacing.xl,
  },
  dots: {
    flexDirection: "row",
    gap: spacing.md,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: "transparent",
  },
  dotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pad: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
  },
  key: {
    width: 76,
    height: 64,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  keyPressed: {
    backgroundColor: colors.surface,
  },
  keyLabel: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: "500",
  },
})
