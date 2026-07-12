/**
 * Minimal ERC-20 ABI encoding/decoding for `balanceOf` and `transfer`.
 * Selectors are derived from keccak256 of the signature so there are no
 * magic constants to get wrong. Pure TS - testable in Node.
 */
import { keccak_256 } from "@noble/hashes/sha3.js"
import { bytesToHex, concatBytes, hexToBytes, utf8ToBytes } from "../../crypto/bytes"

/** First 4 bytes of keccak256(signature) = the function selector. */
export function selector(signature: string): Uint8Array {
  return keccak_256(utf8ToBytes(signature)).subarray(0, 4)
}

const BALANCE_OF = selector("balanceOf(address)")
const TRANSFER = selector("transfer(address,uint256)")

/** Left-pad a 20-byte 0x address to a 32-byte ABI word. */
function encodeAddress(address: string): Uint8Array {
  const bytes = hexToBytes(address)
  if (bytes.length !== 20) throw new Error("Invalid address length")
  const word = new Uint8Array(32)
  word.set(bytes, 12)
  return word
}

/** Encode a non-negative bigint as a 32-byte ABI word. */
function encodeUint(value: bigint): Uint8Array {
  if (value < 0n) throw new Error("uint must be non-negative")
  let hex = value.toString(16)
  if (hex.length > 64) throw new Error("uint overflow")
  hex = hex.padStart(64, "0")
  return hexToBytes(hex)
}

/** `balanceOf(address)` calldata, 0x-prefixed. */
export function encodeBalanceOf(owner: string): string {
  return "0x" + bytesToHex(concatBytes(BALANCE_OF, encodeAddress(owner)))
}

/** `transfer(address,uint256)` calldata, 0x-prefixed. */
export function encodeTransfer(to: string, amount: bigint): string {
  return "0x" + bytesToHex(concatBytes(TRANSFER, encodeAddress(to), encodeUint(amount)))
}

/** Decode a 32-byte hex word (eth_call result) into a bigint. */
export function decodeUint(hex: string): bigint {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex
  if (clean.length === 0) return 0n
  return BigInt("0x" + clean)
}
