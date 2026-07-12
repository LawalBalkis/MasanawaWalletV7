import type { ReactNode } from "react"
import { StyleSheet, View, ScrollView, Pressable, Text } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { colors, spacing, type } from "../lib/theme"

interface ScreenProps {
  children: ReactNode
  /** Optional header title with a back button. */
  title?: string
  /** Show back button (defaults to true when title is set). */
  back?: boolean
  /** Use a ScrollView body (default true). */
  scroll?: boolean
}

/** Safe-area screen wrapper with an optional back header. */
export function Screen({ children, title, back, scroll = true }: ScreenProps) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const showHeader = title != null
  const showBack = back ?? showHeader

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, styles.content, { paddingBottom: insets.bottom + spacing.lg }]}>{children}</View>
  )

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {showHeader && (
        <View style={styles.header}>
          {showBack ? (
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={styles.backButton}
            >
              <Text style={styles.backChevron}>{"\u2039"}</Text>
            </Pressable>
          ) : (
            <View style={styles.backButton} />
          )}
          <Text style={[type.heading, styles.headerTitle]} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.backButton} />
        </View>
      )}
      {body}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    height: 52,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backChevron: {
    color: colors.foreground,
    fontSize: 32,
    lineHeight: 36,
    marginTop: -4,
  },
})
