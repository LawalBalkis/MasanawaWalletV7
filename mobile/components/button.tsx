import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native"
import { colors, radius, spacing } from "../lib/theme"

interface ButtonProps {
  label: string
  onPress: () => void
  variant?: "primary" | "secondary" | "danger" | "ghost"
  disabled?: boolean
  loading?: boolean
}

export function Button({ label, onPress, variant = "primary", disabled, loading }: ButtonProps) {
  const isDisabled = disabled || loading
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!isDisabled }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.primaryForeground : colors.foreground} />
      ) : (
        <Text style={[styles.label, labelStyles[variant]]}>{label}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.danger },
  ghost: { backgroundColor: "transparent" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
  label: { fontSize: 16, fontWeight: "600" },
})

const labelStyles = StyleSheet.create({
  primary: { color: colors.primaryForeground },
  secondary: { color: colors.foreground },
  danger: { color: colors.danger },
  ghost: { color: colors.muted },
})
