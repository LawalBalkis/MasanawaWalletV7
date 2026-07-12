import { useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { useRouter } from "expo-router"
import { Screen } from "../components/screen"
import { Button } from "../components/button"
import { isValidMnemonic, normalizeMnemonic, suggestWords } from "../lib/crypto/mnemonic"
import { setPendingMnemonic } from "../lib/onboarding-store"
import { colors, radius, spacing, type } from "../lib/theme"

export default function ImportWallet() {
  const router = useRouter()
  const [input, setInput] = useState("")

  const words = useMemo(() => normalizeMnemonic(input).split(" ").filter(Boolean), [input])
  const lastFragment = /\s$/.test(input) ? "" : (words[words.length - 1] ?? "")
  const suggestions = useMemo(
    () => (lastFragment.length >= 2 && words.length <= 24 ? suggestWords(lastFragment) : []),
    [lastFragment, words.length],
  )
  const complete = words.length === 12 || words.length === 24
  const valid = complete && isValidMnemonic(input)

  function applySuggestion(word: string) {
    const parts = normalizeMnemonic(input).split(" ").filter(Boolean)
    parts[parts.length - 1] = word
    setInput(parts.join(" ") + " ")
  }

  function next() {
    setPendingMnemonic(normalizeMnemonic(input))
    setInput("")
    router.push("/set-pin")
  }

  return (
    <Screen title="Import wallet">
      <Text style={type.body}>Enter your 12 or 24-word recovery phrase, separated by spaces.</Text>
      <TextInput
        style={styles.input}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        secureTextEntry={false}
        value={input}
        onChangeText={setInput}
        placeholder="oyster whip lemon ..."
        placeholderTextColor={colors.muted}
        accessibilityLabel="Recovery phrase input"
      />
      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map((word) => (
            <Pressable
              key={word}
              onPress={() => applySuggestion(word)}
              accessibilityRole="button"
              accessibilityLabel={`Use word ${word}`}
              style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            >
              <Text style={styles.chipText}>{word}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={styles.statusRow}>
        <Text style={type.caption}>
          {words.length} {words.length === 1 ? "word" : "words"}
        </Text>
        {complete && !valid && <Text style={styles.invalid}>Invalid phrase (checksum failed)</Text>}
        {valid && <Text style={styles.valid}>Valid phrase</Text>}
      </View>
      <Button label="Continue" onPress={next} disabled={!valid} />
      <Text style={type.caption}>
        Your phrase is processed entirely on this device and encrypted with your PIN. It is never sent anywhere.
      </Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  input: {
    minHeight: 120,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.foreground,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: "top",
  },
  suggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  chipPressed: {
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.foreground,
    fontSize: 14,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  invalid: {
    color: colors.danger,
    fontSize: 13,
  },
  valid: {
    color: colors.primary,
    fontSize: 13,
  },
})
