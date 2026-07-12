/**
 * BIP39 mnemonic generation and validation.
 * Uses audited @scure/bip39. Pure TS - testable in Node.
 *
 * Randomness: @scure/bip39's generateMnemonic uses the platform CSPRNG
 * (crypto.getRandomValues). In the app entry we polyfill this via
 * react-native-get-random-values, which delegates to the OS CSPRNG.
 */
import { generateMnemonic, validateMnemonic, mnemonicToSeedSync } from "@scure/bip39"
import { wordlist } from "@scure/bip39/wordlists/english.js"

/** Generate a new 12-word mnemonic (128-bit entropy) from the OS CSPRNG. */
export function createMnemonic(): string {
  return generateMnemonic(wordlist, 128)
}

/** Validate words + BIP39 checksum. */
export function isValidMnemonic(mnemonic: string): boolean {
  return validateMnemonic(normalizeMnemonic(mnemonic), wordlist)
}

/** Normalize user input: trim, collapse whitespace, lowercase. */
export function normalizeMnemonic(mnemonic: string): string {
  return mnemonic.trim().toLowerCase().split(/\s+/).join(" ")
}

/**
 * Derive the 64-byte BIP39 seed. Caller MUST zero the returned
 * buffer after use (see zero() in bytes.ts).
 */
export function mnemonicToSeed(mnemonic: string): Uint8Array {
  return mnemonicToSeedSync(normalizeMnemonic(mnemonic))
}

/** The full English BIP39 wordlist, for import autocomplete. */
export const BIP39_WORDLIST: readonly string[] = wordlist

/** Words matching a prefix, for autocomplete (max `limit` results). */
export function suggestWords(prefix: string, limit = 6): string[] {
  const p = prefix.toLowerCase()
  if (!p) return []
  const out: string[] = []
  for (const w of wordlist) {
    if (w.startsWith(p)) {
      out.push(w)
      if (out.length >= limit) break
    }
  }
  return out
}
