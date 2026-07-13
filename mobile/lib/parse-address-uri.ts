/**
 * Parse the payload of a scanned QR code into a recipient address and
 * optional amount.
 *
 * Supported payloads:
 * - Plain addresses:            "0xabc...", "T9y...", "9WzD..."
 * - EIP-681-style EVM URIs:     "ethereum:0xabc...@1?value=..."
 * - Solana Pay URIs:            "solana:<address>?amount=0.5&label=..."
 * - TRON URIs:                  "tron:T9y...?amount=10"
 *
 * The parser is intentionally lenient: it extracts the address (and a
 * human-readable `amount` param when present) and leaves chain-specific
 * validation to `isValidAddress`, which the caller runs against the
 * currently selected chain.
 */

export interface ParsedAddressUri {
  address: string
  /** Decimal amount string from an `amount` query param, if present. */
  amount?: string
  /** URI scheme if one was present (e.g. "ethereum", "solana", "tron"). */
  scheme?: string
}

/** Schemes we recognize; anything else is treated as a plain address. */
const KNOWN_SCHEMES = ["ethereum", "solana", "tron", "base", "arbitrum", "optimism", "bnb"] as const

export function parseAddressUri(raw: string): ParsedAddressUri | null {
  const data = raw.trim()
  if (!data) return null

  const schemeMatch = data.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):(.+)$/)
  if (!schemeMatch) {
    // Plain address payload.
    return { address: data }
  }

  const scheme = schemeMatch[1].toLowerCase()
  if (!(KNOWN_SCHEMES as readonly string[]).includes(scheme)) {
    // Unknown scheme (e.g. a URL) - not an address QR.
    return null
  }

  let rest = schemeMatch[2]
  // Strip an optional leading "//" (some wallets emit "ethereum://0x...").
  if (rest.startsWith("//")) rest = rest.slice(2)

  // Split off the query string before touching the address part.
  const [pathPart, queryPart] = splitOnce(rest, "?")

  // EIP-681 allows "@<chainId>" and "/transfer" style suffixes; the address
  // is always the leading segment.
  let address = pathPart
  const atIndex = address.indexOf("@")
  if (atIndex !== -1) address = address.slice(0, atIndex)
  const slashIndex = address.indexOf("/")
  if (slashIndex !== -1) address = address.slice(0, slashIndex)
  address = address.trim()
  if (!address) return null

  let amount: string | undefined
  if (queryPart) {
    for (const pair of queryPart.split("&")) {
      const [key, value] = splitOnce(pair, "=")
      if (!value) continue
      // "amount" (Solana Pay, TRON) is a decimal token amount. EIP-681's
      // "value" is in wei, which we cannot map to a display amount without
      // knowing decimals of the selected asset, so it is ignored.
      if (key === "amount") {
        const decoded = safeDecode(value)
        if (/^\d+(\.\d+)?$/.test(decoded)) amount = decoded
      }
    }
  }

  return { address, amount, scheme }
}

function splitOnce(value: string, separator: string): [string, string | undefined] {
  const index = value.indexOf(separator)
  if (index === -1) return [value, undefined]
  return [value.slice(0, index), value.slice(index + 1)]
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
