import { useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { Screen } from "../components/screen"
import { Button } from "../components/button"
import { getPendingMnemonic } from "../lib/onboarding-store"
import { BIP39_WORDLIST } from "../lib/crypto/mnemonic"
import { colors, radius, spacing, type } from "../lib/theme"

interface Challenge {
  /** 0-based word index being asked about. */
  index: number
  /** Shuffled options including the correct word. */
  options: string[]
  answer: string
}

function buildChallenges(words: string[]): Challenge[] {
  // Pick 3 distinct positions.
  const positions: number[] = []
  while (positions.length < 3) {
    const p = Math.floor(Math.random() * words.length)
    if (!positions.includes(p)) positions.push(p)
  }
  positions.sort((a, b) => a - b)

  return positions.map((index) => {
    const answer = words[index]
    const options = new Set<string>([answer])
    while (options.size < 4) {
      const w = BIP39_WORDLIST[Math.floor(Math.random() * BIP39_WORDLIST.length)]
      if (!words.includes(w)) options.add(w)
    }
    return { index, answer, options: [...options].sort(() => Math.random() - 0.5) }
  })
}

export default function CreateVerify() {
  const router = useRouter()
  const mnemonic = getPendingMnemonic()
  const words = useMemo(() => (mnemonic ? mnemonic.split(" ") : []), [mnemonic])
  const [challenges] = useState<Challenge[]>(() => (words.length ? buildChallenges(words) : []))
  const [step, setStep] = useState(0)
  const [wrong, setWrong] = useState(false)

  // Flow entered without a pending mnemonic (e.g. app reloaded): restart.
  if (!mnemonic || challenges.length === 0) {
    return (
      <Screen title="Verify phrase">
        <Text style={type.body}>This session expired. Start again to generate a new phrase.</Text>
        <Button label="Start over" onPress={() => router.replace("/create-backup")} />
      </Screen>
    )
  }

  const challenge = challenges[step]

  function choose(option: string) {
    if (option !== challenge.answer) {
      setWrong(true)
      return
    }
    setWrong(false)
    if (step + 1 < challenges.length) {
      setStep(step + 1)
    } else {
      router.push("/set-pin")
    }
  }

  return (
    <Screen title="Verify phrase">
      <Text style={type.body}>
        Confirm you saved your phrase. Question {step + 1} of {challenges.length}.
      </Text>
      <View style={styles.card}>
        <Text style={[type.heading, styles.question]}>Which is word #{challenge.index + 1}?</Text>
        <View style={styles.options}>
          {challenge.options.map((option) => (
            <Pressable
              key={option}
              onPress={() => choose(option)}
              accessibilityRole="button"
              accessibilityLabel={`Choose ${option}`}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            >
              <Text style={styles.optionText}>{option}</Text>
            </Pressable>
          ))}
        </View>
        {wrong && <Text style={styles.wrongText}>{"That's not right. Check your written backup and try again."}</Text>}
      </View>
      <Button label="Back to phrase" variant="ghost" onPress={() => router.back()} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  question: {
    textAlign: "center",
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "center",
  },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    minWidth: "45%",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  optionPressed: {
    borderColor: colors.primary,
  },
  optionText: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "500",
  },
  wrongText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
  },
})
