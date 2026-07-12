/**
 * Vault encryption: AES-256-GCM with a key derived from
 * (device secret held in SecureStore) + (user PIN stretched with scrypt).
 *
 * Pure TS - no Expo imports - so it is testable in Node. The device
 * secret and PIN are supplied by the storage layer.
 */
import { gcm } from "@noble/ciphers/aes.js"
import { scrypt } from "@noble/hashes/scrypt.js"
import { sha256 } from "@noble/hashes/sha2.js"
import { hmac } from "@noble/hashes/hmac.js"
import { bytesToHex, concatBytes, hexToBytes, utf8ToBytes, zero } from "./bytes"

/** scrypt parameters: N=2^15, r=8, p=1 (~50-150ms on modern phones). */
const SCRYPT_PARAMS = { N: 2 ** 15, r: 8, p: 1, dkLen: 32 }

export interface EncryptedVault {
  /** hex */ salt: string
  /** hex */ nonce: string
  /** hex */ ciphertext: string
  version: 1
}

/**
 * Stretch the PIN with scrypt, then mix with the device secret via
 * HMAC-SHA256 so BOTH are required to reconstruct the AES key.
 * Caller MUST zero the returned key.
 */
export function deriveVaultKey(pin: string, deviceSecret: Uint8Array, salt: Uint8Array): Uint8Array {
  const pinBytes = utf8ToBytes(pin)
  const stretched = scrypt(pinBytes, salt, SCRYPT_PARAMS)
  try {
    return hmac(sha256, deviceSecret, stretched)
  } finally {
    zero(pinBytes, stretched)
  }
}

/** Encrypt a plaintext (e.g. the mnemonic) into a vault blob. */
export function encryptVault(
  plaintext: Uint8Array,
  pin: string,
  deviceSecret: Uint8Array,
  randomBytes: (n: number) => Uint8Array,
): EncryptedVault {
  const salt = randomBytes(16)
  const nonce = randomBytes(12)
  const key = deriveVaultKey(pin, deviceSecret, salt)
  try {
    const ciphertext = gcm(key, nonce).encrypt(plaintext)
    return {
      salt: bytesToHex(salt),
      nonce: bytesToHex(nonce),
      ciphertext: bytesToHex(ciphertext),
      version: 1,
    }
  } finally {
    zero(key)
  }
}

/**
 * Decrypt a vault blob. Throws on wrong PIN / tampered data (GCM auth).
 * Caller MUST zero the returned plaintext after use.
 */
export function decryptVault(vault: EncryptedVault, pin: string, deviceSecret: Uint8Array): Uint8Array {
  const salt = hexToBytes(vault.salt)
  const nonce = hexToBytes(vault.nonce)
  const ciphertext = hexToBytes(vault.ciphertext)
  const key = deriveVaultKey(pin, deviceSecret, salt)
  try {
    return gcm(key, nonce).decrypt(ciphertext)
  } finally {
    zero(key, salt, nonce)
  }
}

/**
 * Constant-time-ish PIN check helper is intentionally NOT provided:
 * correctness of the PIN is proven by successful AES-GCM decryption,
 * so no separate PIN hash is stored anywhere.
 */
export function serializeVault(vault: EncryptedVault): string {
  return JSON.stringify(vault)
}

export function parseVault(json: string): EncryptedVault {
  const v = JSON.parse(json) as EncryptedVault
  if (v.version !== 1 || !v.salt || !v.nonce || !v.ciphertext) {
    throw new Error("Invalid vault format")
  }
  return v
}
