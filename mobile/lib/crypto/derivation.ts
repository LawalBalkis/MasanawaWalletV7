/**
 * HD key + address derivation for EVM, Solana and TRON.
 * Pure TS (audited @scure / @noble libs only) - testable in Node.
 *
 * Paths:
 * - EVM (ETH, Base, Arbitrum, Optimism, BSC): m/44'/60'/0'/0/0 (secp256k1)
 * - Solana:                                   m/44'/501'/0'/0'  (SLIP-10 ed25519)
 * - TRON:                                     m/44'/195'/0'/0/0 (secp256k1)
 */
import { HDKey } from "@scure/bip32"
import { secp256k1 } from "@noble/curves/secp256k1.js"
import { ed25519 } from "@noble/curves/ed25519.js"
import { keccak_256 } from "@noble/hashes/sha3.js"
import { sha256 } from "@noble/hashes/sha2.js"
import { hmac } from "@noble/hashes/hmac.js"
import { sha512 } from "@noble/hashes/sha2.js"
import bs58 from "bs58"
import { bytesToHex, concatBytes, utf8ToBytes, zero } from "./bytes"

export const DERIVATION_PATHS = {
  evm: "m/44'/60'/0'/0/0",
  solana: "m/44'/501'/0'/0'",
  tron: "m/44'/195'/0'/0/0",
} as const

/* ------------------------------ secp256k1 ------------------------------ */

/**
 * Derive a secp256k1 private key from a BIP39 seed at `path`.
 * Caller MUST zero the returned key after use.
 */
export function deriveSecp256k1PrivateKey(seed: Uint8Array, path: string): Uint8Array {
  const root = HDKey.fromMasterSeed(seed)
  const child = root.derive(path)
  const priv = child.privateKey
  if (!priv) throw new Error("Failed to derive private key")
  const copy = new Uint8Array(priv)
  // Wipe HDKey internals we can reach.
  root.wipePrivateData()
  child.wipePrivateData()
  return copy
}

/** Uncompressed secp256k1 public key (65 bytes, 0x04-prefixed). */
function secpPublicKeyUncompressed(privateKey: Uint8Array): Uint8Array {
  return secp256k1.getPublicKey(privateKey, false)
}

/* -------------------------------- EVM ---------------------------------- */

/** EIP-55 checksummed address from a private key. */
export function evmAddressFromPrivateKey(privateKey: Uint8Array): string {
  const pub = secpPublicKeyUncompressed(privateKey)
  // keccak256 of the 64-byte public key (drop the 0x04 prefix); last 20 bytes.
  const hash = keccak_256(pub.subarray(1))
  const addr = hash.subarray(12)
  zero(pub)
  return toChecksumAddress(bytesToHex(addr))
}

/** EIP-55 checksum encoding. */
export function toChecksumAddress(addressHex: string): string {
  const lower = addressHex.toLowerCase().replace(/^0x/, "")
  const hash = bytesToHex(keccak_256(utf8ToBytes(lower)))
  let out = "0x"
  for (let i = 0; i < lower.length; i++) {
    out += Number.parseInt(hash[i], 16) >= 8 ? lower[i].toUpperCase() : lower[i]
  }
  return out
}

/** Derive the EVM address (same across ETH/Base/Arbitrum/Optimism/BSC). */
export function deriveEvmAddress(seed: Uint8Array): string {
  const priv = deriveSecp256k1PrivateKey(seed, DERIVATION_PATHS.evm)
  try {
    return evmAddressFromPrivateKey(priv)
  } finally {
    zero(priv)
  }
}

/* -------------------------------- TRON --------------------------------- */

/** Base58check TRON address (T...) from a private key. */
export function tronAddressFromPrivateKey(privateKey: Uint8Array): string {
  const pub = secpPublicKeyUncompressed(privateKey)
  const hash = keccak_256(pub.subarray(1))
  zero(pub)
  // 0x41 prefix + last 20 bytes of keccak, then base58check.
  const payload = concatBytes(new Uint8Array([0x41]), hash.subarray(12))
  const checksum = sha256(sha256(payload)).subarray(0, 4)
  return bs58.encode(concatBytes(payload, checksum))
}

export function deriveTronAddress(seed: Uint8Array): string {
  const priv = deriveSecp256k1PrivateKey(seed, DERIVATION_PATHS.tron)
  try {
    return tronAddressFromPrivateKey(priv)
  } finally {
    zero(priv)
  }
}

/* ---------------------------- Solana (SLIP-10) -------------------------- */

const HARDENED_OFFSET = 0x80000000

/**
 * SLIP-10 ed25519 master key + hardened-only derivation.
 * (ed25519 SLIP-10 only supports hardened children.)
 */
function slip10Ed25519Derive(seed: Uint8Array, path: string): Uint8Array {
  // Master
  let I = hmac(sha512, utf8ToBytes("ed25519 seed"), seed)
  let key = I.slice(0, 32)
  let chainCode = I.slice(32)
  zero(I)

  const segments = path
    .split("/")
    .slice(1) // drop "m"
    .map((seg) => {
      if (!seg.endsWith("'")) throw new Error("SLIP-10 ed25519 requires hardened path segments")
      return Number.parseInt(seg.slice(0, -1), 10) + HARDENED_OFFSET
    })

  for (const index of segments) {
    const indexBytes = new Uint8Array(4)
    new DataView(indexBytes.buffer).setUint32(0, index, false)
    const data = concatBytes(new Uint8Array([0]), key, indexBytes)
    I = hmac(sha512, chainCode, data)
    zero(key, chainCode, data)
    key = I.slice(0, 32)
    chainCode = I.slice(32)
    zero(I)
  }
  zero(chainCode)
  return key
}

/**
 * Derive the Solana ed25519 private key (32-byte seed form).
 * Caller MUST zero the returned key after use.
 */
export function deriveSolanaPrivateKey(seed: Uint8Array): Uint8Array {
  return slip10Ed25519Derive(seed, DERIVATION_PATHS.solana)
}

/** Base58 Solana address (the ed25519 public key). */
export function solanaAddressFromPrivateKey(privateKey: Uint8Array): string {
  const pub = ed25519.getPublicKey(privateKey)
  return bs58.encode(pub)
}

export function deriveSolanaAddress(seed: Uint8Array): string {
  const priv = deriveSolanaPrivateKey(seed)
  try {
    return solanaAddressFromPrivateKey(priv)
  } finally {
    zero(priv)
  }
}

/* ------------------------------ All at once ----------------------------- */

export interface WalletAddresses {
  evm: string
  solana: string
  tron: string
}

/** Derive all public addresses from a seed. Zeroes nothing - caller owns seed. */
export function deriveAllAddresses(seed: Uint8Array): WalletAddresses {
  return {
    evm: deriveEvmAddress(seed),
    solana: deriveSolanaAddress(seed),
    tron: deriveTronAddress(seed),
  }
}
