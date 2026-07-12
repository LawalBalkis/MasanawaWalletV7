/**
 * Recipient address validation + decimal amount parsing.
 * Pure TS - testable in Node.
 */
import { sha256 } from "@noble/hashes/sha2.js"
import bs58 from "bs58"
import { toChecksumAddress } from "../crypto/derivation"
import type { ChainKind } from "./config"

/** EVM: 0x + 40 hex chars; if mixed-case, the EIP-55 checksum must hold. */
export function isValidEvmAddress(address: string): boolean {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return false
  const body = address.slice(2)
  // All-lower or all-upper addresses carry no checksum information.
  if (body === body.toLowerCase() || body === body.toUpperCase()) return true
  return toChecksumAddress(address) === address
}

/** Solana: base58, decodes to exactly 32 bytes. */
export function isValidSolanaAddress(address: string): boolean {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return false
  try {
    return bs58.decode(address).length === 32
  } catch {
    return false
  }
}

/** TRON: base58check, 21-byte payload with 0x41 prefix + 4-byte checksum. */
export function isValidTronAddress(address: string): boolean {
  if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)) return false
  try {
    const decoded = bs58.decode(address)
    if (decoded.length !== 25 || decoded[0] !== 0x41) return false
    const payload = decoded.subarray(0, 21)
    const checksum = decoded.subarray(21)
    const expected = sha256(sha256(payload)).subarray(0, 4)
    return checksum.every((b, i) => b === expected[i])
  } catch {
    return false
  }
}

export function isValidAddress(kind: ChainKind, address: string): boolean {
  switch (kind) {
    case "evm":
      return isValidEvmAddress(address)
    case "solana":
      return isValidSolanaAddress(address)
    case "tron":
      return isValidTronAddress(address)
  }
}

/**
 * Parse a decimal string ("0.05") into the chain's smallest unit.
 * Throws on malformed input or more fractional digits than `decimals`.
 */
export function parseUnits(value: string, decimals: number): bigint {
  const trimmed = value.trim()
  if (!/^\d+(\.\d+)?$/.test(trimmed)) throw new Error("Invalid amount")
  const [whole, frac = ""] = trimmed.split(".")
  if (frac.length > decimals) throw new Error(`Max ${decimals} decimal places`)
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(frac.padEnd(decimals, "0") || "0")
}
