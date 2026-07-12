import { useCallback, useMemo, useState } from "react"
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { useRouter } from "expo-router"
import * as Clipboard from "expo-clipboard"
import useSWR from "swr"
import { Screen } from "../components/screen"
import { Button } from "../components/button"
import { PinPad } from "../components/pin-pad"
import { useWallet } from "../lib/wallet-context"
import { CHAINS, type ChainConfig } from "../lib/chains/config"
import { fetchAllBalances, formatUnits } from "../lib/chains/balances"
import { estimateFee, maxSendable, sendNative, type FeeEstimate } from "../lib/chains/send"
import { isValidAddress, parseUnits } from "../lib/chains/validate"
import { unlockVault, VaultLockedError, WrongPinError } from "../lib/storage/vault"
import { colors, radius, spacing, type } from "../lib/theme"

type Step = "form" | "review" | "pin" | "sending" | "done"

function shorten(address: string): string {
  return address.length > 16 ? `${address.slice(0, 8)}...${address.slice(-6)}` : address
}

export default function Send() {
  const router = useRouter()
  const { addresses, touch } = useWallet()
  const [chain, setChain] = useState<ChainConfig>(CHAINS[0])
  const [recipient, setRecipient] = useState("")
  const [amount, setAmount] = useState("")
  const [step, setStep] = useState<Step>("form")
  const [error, setError] = useState<string | null>(null)
  const [pinClear, setPinClear] = useState(0)
  const [txHash, setTxHash] = useState<string | null>(null)

  // Shares the SWR cache key with the home screen.
  const { data: balances } = useSWR(
    addresses ? ["balances", addresses.evm, addresses.solana, addresses.tron] : null,
    () => fetchAllBalances(addresses!),
    { revalidateOnFocus: false },
  )
  const { data: fee } = useSWR(["fee", chain.id], () => estimateFee(chain), {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
  })

  const fromAddress = addresses ? addresses[chain.kind] : null
  const balance = balances?.find((b) => b.chainId === chain.id)
  const balanceRaw = balance && !balance.error ? BigInt(balance.raw) : null

  const recipientValid = recipient.length > 0 && isValidAddress(chain.kind, recipient.trim())
  const selfSend = recipient.trim() === fromAddress && chain.kind !== "evm"

  const amountRaw = useMemo(() => {
    if (!amount) return null
    try {
      return parseUnits(amount, chain.decimals)
    } catch {
      return null
    }
  }, [amount, chain.decimals])

  const insufficient =
    amountRaw != null && balanceRaw != null && fee != null && amountRaw + fee.raw > balanceRaw

  const formValid =
    recipientValid && !selfSend && amountRaw != null && amountRaw > 0n && balanceRaw != null && fee != null && !insufficient

  const selectChain = useCallback(
    (next: ChainConfig) => {
      touch()
      setChain(next)
      setRecipient("")
      setAmount("")
      setError(null)
    },
    [touch],
  )

  const pasteRecipient = useCallback(async () => {
    touch()
    const text = await Clipboard.getStringAsync()
    if (text) setRecipient(text.trim())
  }, [touch])

  const setMax = useCallback(() => {
    touch()
    if (balanceRaw == null || fee == null) return
    setAmount(formatUnits(maxSendable(balanceRaw, fee), chain.decimals))
  }, [balanceRaw, fee, chain.decimals, touch])

  const confirmWithPin = useCallback(
    async (pin: string) => {
      touch()
      setError(null)
      setStep("sending")
      let mnemonic: string | null = null
      try {
        mnemonic = await unlockVault(pin)
        const hash = await sendNative(chain, fromAddress!, recipient.trim(), amountRaw!, mnemonic)
        setTxHash(hash)
        setStep("done")
      } catch (e) {
        setPinClear((n) => n + 1)
        if (e instanceof WrongPinError) {
          setError("Incorrect PIN. Try again.")
          setStep("pin")
        } else if (e instanceof VaultLockedError) {
          setError("Too many failed attempts. Try again later.")
          setStep("review")
        } else {
          setError(e instanceof Error ? e.message : "Transaction failed")
          setStep("review")
        }
      } finally {
        mnemonic = null
      }
    },
    [chain, fromAddress, recipient, amountRaw, touch],
  )

  if (!addresses || !fromAddress) return null

  /* ------------------------------ Done ------------------------------ */
  if (step === "done" && txHash) {
    return (
      <Screen title="Sent" back={false}>
        <View style={styles.card}>
          <Text style={[type.heading, styles.centered]}>Transaction submitted</Text>
          <Text style={[type.caption, styles.centered]}>
            {amount} {chain.symbol} on {chain.name} to {shorten(recipient.trim())}
          </Text>
          <Text style={[type.mono, styles.centered]} selectable>
            {shorten(txHash)}
          </Text>
        </View>
        <Button
          label="View on explorer"
          variant="secondary"
          onPress={() => {
            touch()
            Linking.openURL(chain.explorerTx + txHash)
          }}
        />
        <Button
          label="Done"
          onPress={() => {
            touch()
            router.replace("/home")
          }}
        />
      </Screen>
    )
  }

  /* --------------------------- PIN / sending --------------------------- */
  if (step === "pin" || step === "sending") {
    return (
      <Screen title="Confirm" back={step === "pin"} scroll={false}>
        <View style={styles.pinBody}>
          <Text style={[type.body, styles.centered]}>
            {step === "sending" ? "Signing and broadcasting..." : `Enter your PIN to send ${amount} ${chain.symbol}`}
          </Text>
          {error && <Text style={[styles.errorText, styles.centered]}>{error}</Text>}
          <PinPad onComplete={confirmWithPin} clearSignal={pinClear} disabled={step === "sending"} />
        </View>
      </Screen>
    )
  }

  /* ------------------------------ Review ------------------------------ */
  if (step === "review") {
    return (
      <Screen title="Review">
        <View style={styles.card}>
          <ReviewRow label="Network" value={chain.name} />
          <ReviewRow label="To" value={shorten(recipient.trim())} mono />
          <ReviewRow label="Amount" value={`${amount} ${chain.symbol}`} />
          <ReviewRow label="Network fee" value={fee?.formatted ?? "..."} />
          {fee?.note && <Text style={type.caption}>{fee.note}</Text>}
        </View>
        <Text style={type.caption}>
          Transactions are irreversible. Double-check the recipient address and network before confirming.
        </Text>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <Button
          label="Confirm with PIN"
          onPress={() => {
            touch()
            setError(null)
            setStep("pin")
          }}
        />
        <Button label="Back" variant="ghost" onPress={() => setStep("form")} />
      </Screen>
    )
  }

  /* ------------------------------- Form ------------------------------- */
  return (
    <Screen title="Send">
      <Text style={type.caption}>Network</Text>
      <View style={styles.chainGrid}>
        {CHAINS.map((c) => {
          const active = c.id === chain.id
          return (
            <Pressable
              key={c.id}
              onPress={() => selectChain(c)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Select ${c.name}`}
              style={[styles.chainChip, active && styles.chainChipActive]}
            >
              <View style={[styles.chainDot, { backgroundColor: c.color }]} />
              <Text style={[styles.chainChipText, active && styles.chainChipTextActive]}>{c.name}</Text>
            </Pressable>
          )
        })}
      </View>

      <Text style={type.caption}>Recipient address</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={recipient}
          onChangeText={(t) => {
            touch()
            setRecipient(t)
          }}
          placeholder={chain.kind === "evm" ? "0x..." : chain.kind === "tron" ? "T..." : "Solana address"}
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          accessibilityLabel="Recipient address"
        />
        <Pressable onPress={pasteRecipient} hitSlop={8} accessibilityRole="button" accessibilityLabel="Paste address">
          <Text style={styles.inlineAction}>Paste</Text>
        </Pressable>
      </View>
      {recipient.length > 0 && !recipientValid && <Text style={styles.errorText}>Invalid {chain.name} address</Text>}
      {selfSend && <Text style={styles.errorText}>Cannot send to your own address on {chain.name}</Text>}

      <Text style={type.caption}>Amount</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={amount}
          onChangeText={(t) => {
            touch()
            setAmount(t.replace(",", "."))
          }}
          placeholder="0.0"
          placeholderTextColor={colors.muted}
          keyboardType="decimal-pad"
          style={styles.input}
          accessibilityLabel="Amount"
        />
        <Text style={styles.inputSymbol}>{chain.symbol}</Text>
        <Pressable onPress={setMax} hitSlop={8} accessibilityRole="button" accessibilityLabel="Use maximum amount">
          <Text style={styles.inlineAction}>Max</Text>
        </Pressable>
      </View>
      <Text style={type.caption}>
        Available: {balance && !balance.error ? `${balance.formatted} ${chain.symbol}` : "..."}
        {fee ? `  \u00B7  Fee: ${fee.formatted}` : ""}
      </Text>
      {amount.length > 0 && amountRaw == null && <Text style={styles.errorText}>Invalid amount</Text>}
      {insufficient && <Text style={styles.errorText}>Insufficient balance to cover amount plus network fee</Text>}

      <Button
        label="Review"
        disabled={!formValid}
        onPress={() => {
          touch()
          setError(null)
          setStep("review")
        }}
      />
    </Screen>
  )
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={type.caption}>{label}</Text>
      <Text style={mono ? type.mono : type.body} selectable={mono}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  chainGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chainChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chainChipActive: {
    borderColor: colors.primary,
  },
  chainDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  chainChipText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  chainChipTextActive: {
    color: colors.foreground,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  input: {
    flex: 1,
    color: colors.foreground,
    fontSize: 15,
    height: "100%",
  },
  inputSymbol: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  inlineAction: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  reviewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  pinBody: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.lg,
  },
  centered: {
    textAlign: "center",
  },
})
