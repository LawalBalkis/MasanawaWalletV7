import { useCallback, useMemo, useState } from "react"
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import * as Clipboard from "expo-clipboard"
import useSWR, { useSWRConfig } from "swr"
import { Screen } from "../components/screen"
import { Button } from "../components/button"
import { PinPad } from "../components/pin-pad"
import { QrScanner } from "../components/qr-scanner"
import { parseAddressUri } from "../lib/parse-address-uri"
import { useWallet } from "../lib/wallet-context"
import { CHAINS, type ChainConfig } from "../lib/chains/config"
import { findToken, tokensForChain, type TokenConfig } from "../lib/chains/tokens"
import { fetchPortfolio } from "../lib/chains/portfolio"
import { formatUnits } from "../lib/chains/balances"
import { estimateFee, maxSendable, sendNative } from "../lib/chains/send"
import { estimateTokenFee, sendToken } from "../lib/chains/send-token"
import { recordActivity } from "../lib/storage/activity"
import { isValidAddress, parseUnits } from "../lib/chains/validate"
import { unlockVault, VaultLockedError, WrongPinError } from "../lib/storage/vault"
import { colors, radius, spacing, type } from "../lib/theme"

type Step = "form" | "review" | "pin" | "sending" | "done"

function shorten(address: string): string {
  return address.length > 16 ? `${address.slice(0, 8)}...${address.slice(-6)}` : address
}

/**
 * Resolve the `asset` route param into an initial chain + token selection.
 * The param is either a chain id (native asset) or a token id ("chain:SYMBOL").
 */
function resolveAsset(asset?: string): { chain: ChainConfig; token: TokenConfig | null } {
  if (asset) {
    const token = findToken(asset)
    if (token) {
      const chain = CHAINS.find((c) => c.id === token.chainId)
      if (chain) return { chain, token }
    }
    const chain = CHAINS.find((c) => c.id === asset)
    if (chain) return { chain, token: null }
  }
  return { chain: CHAINS[0], token: null }
}

export default function Send() {
  const router = useRouter()
  const { asset } = useLocalSearchParams<{ asset?: string }>()
  const { addresses, settings, touch } = useWallet()
  const { mutate } = useSWRConfig()
  const currency = settings.currency

  const initial = useMemo(() => resolveAsset(asset), [asset])
  const [chain, setChain] = useState<ChainConfig>(initial.chain)
  const [token, setToken] = useState<TokenConfig | null>(initial.token)
  const [recipient, setRecipient] = useState("")
  const [amount, setAmount] = useState("")
  const [step, setStep] = useState<Step>("form")
  const [error, setError] = useState<string | null>(null)
  const [pinClear, setPinClear] = useState(0)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)

  // Shares the SWR cache key (and single RPC/price fan-out) with the home screen.
  const portfolioKey = addresses
    ? ["portfolio", addresses.evm, addresses.solana, addresses.tron, currency]
    : null
  const { data: portfolio } = useSWR(portfolioKey, () => fetchPortfolio(addresses!, currency), {
    revalidateOnFocus: false,
  })

  const fromAddress = addresses ? addresses[chain.kind] : null

  // The asset being sent: symbol / decimals / name differ for tokens vs native.
  const symbol = token ? token.symbol : chain.symbol
  const decimals = token ? token.decimals : chain.decimals
  const assetName = token ? token.name : chain.name
  const chainTokens = useMemo(() => tokensForChain(chain.id), [chain.id])

  const recipientValid = recipient.length > 0 && isValidAddress(chain.kind, recipient.trim())

  // Token fees are paid in the chain's native asset, and (on Solana) depend on
  // whether the recipient's token account must be created, so re-estimate per
  // recipient. Native fees only depend on the chain.
  const feeTo = recipientValid ? recipient.trim() : fromAddress
  const feeKey = token
    ? fromAddress
      ? ["token-fee", chain.id, token.id, fromAddress, feeTo]
      : null
    : ["fee", chain.id]
  const { data: fee } = useSWR(
    feeKey,
    () => (token ? estimateTokenFee(chain, token, fromAddress!, feeTo!) : estimateFee(chain)),
    { refreshInterval: 30_000, revalidateOnFocus: false },
  )

  // Balance of the native asset (always) and of the selected token (if any).
  const nativeBalance = portfolio?.native.find((b) => b.chainId === chain.id)
  const nativeRaw = nativeBalance && !nativeBalance.error ? BigInt(nativeBalance.raw) : null
  const tokenBalance = token ? portfolio?.tokens.find((t) => t.tokenId === token.id) : undefined
  const assetBalance = token ? tokenBalance : nativeBalance
  const assetBalanceRaw = token
    ? tokenBalance && !tokenBalance.error
      ? BigInt(tokenBalance.raw)
      : null
    : nativeRaw

  const selfSend = recipient.trim() === fromAddress && chain.kind !== "evm"

  const amountRaw = useMemo(() => {
    if (!amount) return null
    try {
      return parseUnits(amount, decimals)
    } catch {
      return null
    }
  }, [amount, decimals])

  // For tokens: amount is checked against the token balance, the fee against
  // the native balance. For native sends: amount + fee against the balance.
  const insufficientAsset =
    amountRaw != null &&
    assetBalanceRaw != null &&
    (token ? amountRaw > assetBalanceRaw : fee != null && amountRaw + fee.raw > assetBalanceRaw)
  const insufficientFee = !!token && fee != null && nativeRaw != null && fee.raw > nativeRaw

  const formValid =
    recipientValid &&
    !selfSend &&
    amountRaw != null &&
    amountRaw > 0n &&
    assetBalanceRaw != null &&
    fee != null &&
    !insufficientAsset &&
    !insufficientFee

  const selectChain = useCallback(
    (next: ChainConfig) => {
      touch()
      setChain(next)
      setToken(null)
      setRecipient("")
      setAmount("")
      setError(null)
    },
    [touch],
  )

  const selectAsset = useCallback(
    (next: TokenConfig | null) => {
      touch()
      setToken(next)
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

  /**
   * Handle a scanned QR payload. Returns an error string (scanner keeps
   * running) or null on success (scanner closes).
   */
  const handleScan = useCallback(
    (data: string): string | null => {
      const parsed = parseAddressUri(data)
      if (!parsed) return "Not an address QR code"
      if (!isValidAddress(chain.kind, parsed.address)) {
        return `Not a valid ${chain.name} address`
      }
      touch()
      setRecipient(parsed.address)
      // Only prefill the amount if the QR carried one and the field is empty.
      if (parsed.amount) setAmount((prev) => prev || parsed.amount!)
      setScannerOpen(false)
      return null
    },
    [chain, touch],
  )

  const setMax = useCallback(() => {
    touch()
    if (assetBalanceRaw == null) return
    if (token) {
      // Token fee is paid in the native asset, so the full token balance is sendable.
      setAmount(formatUnits(assetBalanceRaw, decimals))
    } else if (fee != null) {
      setAmount(formatUnits(maxSendable(assetBalanceRaw, fee), decimals))
    }
  }, [assetBalanceRaw, token, fee, decimals, touch])

  const confirmWithPin = useCallback(
    async (pin: string) => {
      touch()
      setError(null)
      setStep("sending")
      let mnemonic: string | null = null
      try {
        mnemonic = await unlockVault(pin)
        const to = recipient.trim()
        const hash = token
          ? await sendToken(chain, token, fromAddress!, to, amountRaw!, mnemonic)
          : await sendNative(chain, fromAddress!, to, amountRaw!, mnemonic)
        setTxHash(hash)
        // Record the broadcast so it shows up (as pending) in the activity feed.
        // A storage failure must not mask a successful broadcast, so swallow it.
        try {
          await recordActivity({
            chainId: chain.id,
            tokenId: token?.id,
            direction: "send",
            from: fromAddress!,
            to,
            amountRaw: amountRaw!.toString(),
            formatted: amount,
            symbol,
            hash,
            timestamp: Date.now(),
            status: "pending",
          })
          void mutate("activity")
          if (portfolioKey) void mutate(portfolioKey)
        } catch {
          // Activity log is best-effort; the tx is already on-chain.
        }
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
    [chain, token, fromAddress, recipient, amountRaw, amount, symbol, portfolioKey, mutate, touch],
  )

  if (!addresses || !fromAddress) return null

  /* ------------------------------ Done ------------------------------ */
  if (step === "done" && txHash) {
    return (
      <Screen title="Sent" back={false}>
        <View style={styles.card}>
          <Text style={[type.heading, styles.centered]}>Transaction submitted</Text>
          <Text style={[type.caption, styles.centered]}>
            {amount} {symbol} on {chain.name} to {shorten(recipient.trim())}
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
            {step === "sending" ? "Signing and broadcasting..." : `Enter your PIN to send ${amount} ${symbol}`}
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
          {token && <ReviewRow label="Asset" value={`${token.name} (${symbol})`} />}
          <ReviewRow label="To" value={shorten(recipient.trim())} mono />
          <ReviewRow label="Amount" value={`${amount} ${symbol}`} />
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

      <Text style={type.caption}>Asset</Text>
      <View style={styles.chainGrid}>
        <Pressable
          onPress={() => selectAsset(null)}
          accessibilityRole="button"
          accessibilityState={{ selected: !token }}
          accessibilityLabel={`Select ${chain.symbol}`}
          style={[styles.chainChip, !token && styles.chainChipActive]}
        >
          <View style={[styles.chainDot, { backgroundColor: chain.color }]} />
          <Text style={[styles.chainChipText, !token && styles.chainChipTextActive]}>{chain.symbol}</Text>
        </Pressable>
        {chainTokens.map((t) => {
          const active = token?.id === t.id
          return (
            <Pressable
              key={t.id}
              onPress={() => selectAsset(t)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Select ${t.symbol}`}
              style={[styles.chainChip, active && styles.chainChipActive]}
            >
              <View style={[styles.chainDot, { backgroundColor: t.color }]} />
              <Text style={[styles.chainChipText, active && styles.chainChipTextActive]}>{t.symbol}</Text>
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
        <Pressable
          onPress={() => {
            touch()
            setScannerOpen(true)
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Scan QR code"
        >
          <Text style={styles.inlineAction}>Scan</Text>
        </Pressable>
      </View>
      <QrScanner visible={scannerOpen} onScan={handleScan} onClose={() => setScannerOpen(false)} />
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
        <Text style={styles.inputSymbol}>{symbol}</Text>
        <Pressable onPress={setMax} hitSlop={8} accessibilityRole="button" accessibilityLabel="Use maximum amount">
          <Text style={styles.inlineAction}>Max</Text>
        </Pressable>
      </View>
      <Text style={type.caption}>
        Available: {assetBalance && !assetBalance.error ? `${assetBalance.formatted} ${symbol}` : "..."}
        {fee ? `  \u00B7  Fee: ${fee.formatted}` : ""}
      </Text>
      {token && <Text style={type.caption}>The network fee is paid in {chain.symbol}.</Text>}
      {amount.length > 0 && amountRaw == null && <Text style={styles.errorText}>Invalid amount</Text>}
      {insufficientAsset && (
        <Text style={styles.errorText}>
          {token ? `Insufficient ${symbol} balance` : "Insufficient balance to cover amount plus network fee"}
        </Text>
      )}
      {insufficientFee && <Text style={styles.errorText}>Not enough {chain.symbol} to cover the network fee</Text>}

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
