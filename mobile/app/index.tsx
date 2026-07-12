import { ActivityIndicator, StyleSheet, View } from "react-native"
import { colors } from "../lib/theme"

/**
 * Initial route. The Gate in _layout redirects to the correct screen
 * once wallet status resolves; this just shows a splash spinner.
 */
export default function Index() {
  return (
    <View style={styles.root}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
})
