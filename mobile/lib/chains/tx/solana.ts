/**
 * Solana legacy System Program transfer, built and signed from scratch
 * (no @solana/web3.js): manual message serialization + ed25519 signing.
 * Pure TS - testable in Node.
 */
import { ed25519 } from "@noble/curves/ed25519.js"
import bs58 from "bs58"
import { concatBytes } from "../../crypto/bytes"

const SYSTEM_PROGRAM_ID = bs58.decode("11111111111111111111111111111111")

/** Solana "shortvec" (compact-u16) length encoding. */
export function encodeShortVecLength(n: number): Uint8Array {
  const out: number[] = []
  let rem = n
  for (;;) {
    let byte = rem & 0x7f
    rem >>= 7
    if (rem === 0) {
      out.push(byte)
      return new Uint8Array(out)
    }
    byte |= 0x80
    out.push(byte)
  }
}

function u32Le(n: number): Uint8Array {
  const out = new Uint8Array(4)
  new DataView(out.buffer).setUint32(0, n, true)
  return out
}

function u64Le(n: bigint): Uint8Array {
  const out = new Uint8Array(8)
  new DataView(out.buffer).setBigUint64(0, n, true)
  return out
}

/**
 * Serialize the legacy message for a single SystemProgram.transfer.
 * Account layout: [from (signer, writable), to (writable), SystemProgram (readonly)].
 * Sending to self is rejected upstream by validation, so from != to here.
 */
export function buildTransferMessage(from: Uint8Array, to: Uint8Array, lamports: bigint, recentBlockhash: Uint8Array): Uint8Array {
  if (from.length !== 32 || to.length !== 32 || recentBlockhash.length !== 32) {
    throw new Error("Invalid key or blockhash length")
  }
  // Instruction data: u32 index 2 (Transfer) + u64 lamports.
  const data = concatBytes(u32Le(2), u64Le(lamports))
  return concatBytes(
    // Header: 1 required signature, 0 readonly signed, 1 readonly unsigned.
    new Uint8Array([1, 0, 1]),
    // Account keys.
    encodeShortVecLength(3),
    from,
    to,
    SYSTEM_PROGRAM_ID,
    recentBlockhash,
    // Instructions.
    encodeShortVecLength(1),
    new Uint8Array([2]), // program id index
    encodeShortVecLength(2),
    new Uint8Array([0, 1]), // account indices: from, to
    encodeShortVecLength(data.length),
    data,
  )
}

/**
 * Sign the message and serialize the full transaction (wire format),
 * base64-encoded for sendTransaction. Does NOT zero `privateKey`.
 */
export function signSolanaTransfer(message: Uint8Array, privateKey: Uint8Array): { serializedBase64: string; signatureBase58: string } {
  const signature = ed25519.sign(message, privateKey)
  const wire = concatBytes(encodeShortVecLength(1), signature, message)
  return {
    serializedBase64: bytesToBase64(wire),
    // The first signature doubles as the transaction id on Solana.
    signatureBase58: bs58.encode(signature),
  }
}

/** Base64 without Buffer (React Native has no Node Buffer by default). */
export function bytesToBase64(bytes: Uint8Array): string {
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
  let out = ""
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0
    out += ALPHABET[b0 >> 2]
    out += ALPHABET[((b0 & 3) << 4) | (b1 >> 4)]
    out += i + 1 < bytes.length ? ALPHABET[((b1 & 15) << 2) | (b2 >> 6)] : "="
    out += i + 2 < bytes.length ? ALPHABET[b2 & 63] : "="
  }
  return out
}
