/**
 * SecureStore-backed encrypted vault.
 *
 * Storage layout:
 * - `vault.deviceSecret` : random 256-bit key, hardware-backed keystore (SecureStore)
 * - `vault.blob`         : AES-256-GCM ciphertext of the mnemonic (SecureStore)
 * - `vault.addresses`    : derived PUBLIC addresses (SecureStore; never keys)
 * - `vault.attempts`     : failed PIN attempt state for throttling
 *
 * The mnemonic can only be recovered with BOTH the device secret
 * (hardware keystore) AND the user's PIN (scrypt-stretched). See
 * lib/crypto/encryption.ts. Plaintext keys never touch disk.
 */
import * as SecureStore from "expo-secure-store"
import * as Crypto from "expo-crypto"
import {
  encryptVault,
  decryptVault,
  parseVault,
  serializeVault,
} from "../crypto/encryption"
import { mnemonicToSeed, normalizeMnemonic } from "../crypto/mnemonic"
import { deriveAllAddresses, type WalletAddresses } from "../crypto/derivation"
import { bytesToHex, hexToBytes, utf8ToBytes, zero } from "../crypto/bytes"

const KEY_DEVICE_SECRET = "vault.deviceSecret"
const KEY_BLOB = "vault.blob"
const KEY_ADDRESSES = "vault.addresses"
const KEY_ATTEMPTS = "vault.attempts"
const KEY_SETTINGS = "vault.settings"

const SECURE_OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
}

function randomBytes(n: number): Uint8Array {
  return Crypto.getRandomBytes(n)
}

/* ----------------------------- Attempts / throttling ----------------------------- */

interface AttemptState {
  count: number
  lockedUntil: number // epoch ms, 0 = not locked
}

/** Escalating delays: 5 fails -> 30s, 8 -> 5min, 10+ -> 30min. */
function lockDurationMs(count: number): number {
  if (count >= 10) return 30 * 60_000
  if (count >= 8) return 5 * 60_000
  if (count >= 5) return 30_000
  return 0
}

export async function getAttemptState(): Promise<AttemptState> {
  const raw = await SecureStore.getItemAsync(KEY_ATTEMPTS, SECURE_OPTS)
  if (!raw) return { count: 0, lockedUntil: 0 }
  try {
    return JSON.parse(raw) as AttemptState
  } catch {
    return { count: 0, lockedUntil: 0 }
  }
}

async function recordFailedAttempt(): Promise<AttemptState> {
  const state = await getAttemptState()
  const count = state.count + 1
  const duration = lockDurationMs(count)
  const next: AttemptState = {
    count,
    lockedUntil: duration > 0 ? Date.now() + duration : 0,
  }
  await SecureStore.setItemAsync(KEY_ATTEMPTS, JSON.stringify(next), SECURE_OPTS)
  return next
}

async function clearAttempts(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_ATTEMPTS)
}

/* --------------------------------- Vault lifecycle -------------------------------- */

export async function vaultExists(): Promise<boolean> {
  const blob = await SecureStore.getItemAsync(KEY_BLOB, SECURE_OPTS)
  return blob != null
}

/**
 * Create the vault: encrypt the mnemonic under deviceSecret+PIN,
 * derive and cache public addresses, and never store the plaintext.
 */
export async function createVault(mnemonic: string, pin: string): Promise<WalletAddresses> {
  const normalized = normalizeMnemonic(mnemonic)

  // Fresh device secret in the hardware-backed keystore.
  const deviceSecret = randomBytes(32)
  const plaintext = utf8ToBytes(normalized)
  const seed = mnemonicToSeed(normalized)
  try {
    const vault = encryptVault(plaintext, pin, deviceSecret, randomBytes)
    const addresses = deriveAllAddresses(seed)

    await SecureStore.setItemAsync(KEY_DEVICE_SECRET, bytesToHex(deviceSecret), SECURE_OPTS)
    await SecureStore.setItemAsync(KEY_BLOB, serializeVault(vault), SECURE_OPTS)
    await SecureStore.setItemAsync(KEY_ADDRESSES, JSON.stringify(addresses), SECURE_OPTS)
    await clearAttempts()
    return addresses
  } finally {
    zero(deviceSecret, plaintext, seed)
  }
}

export class VaultLockedError extends Error {
  constructor(public readonly lockedUntil: number) {
    super("Too many failed attempts")
  }
}

export class WrongPinError extends Error {
  constructor(public readonly attempts: number) {
    super("Incorrect PIN")
  }
}

/**
 * Unlock: decrypt the mnemonic with the PIN. Applies attempt throttling.
 * Returns the plaintext mnemonic - caller MUST NOT persist it and should
 * drop the reference as soon as the needed keys are derived.
 */
export async function unlockVault(pin: string): Promise<string> {
  const attempts = await getAttemptState()
  if (attempts.lockedUntil > Date.now()) {
    throw new VaultLockedError(attempts.lockedUntil)
  }

  const [secretHex, blobJson] = await Promise.all([
    SecureStore.getItemAsync(KEY_DEVICE_SECRET, SECURE_OPTS),
    SecureStore.getItemAsync(KEY_BLOB, SECURE_OPTS),
  ])
  if (!secretHex || !blobJson) throw new Error("No wallet found")

  const deviceSecret = hexToBytes(secretHex)
  try {
    const plaintext = decryptVault(parseVault(blobJson), pin, deviceSecret)
    const mnemonic = new TextDecoder().decode(plaintext)
    zero(plaintext)
    await clearAttempts()
    return mnemonic
  } catch (e) {
    if (e instanceof Error && (e.message.includes("No wallet") || e.message.includes("Invalid vault"))) throw e
    const state = await recordFailedAttempt()
    if (state.lockedUntil > Date.now()) throw new VaultLockedError(state.lockedUntil)
    throw new WrongPinError(state.count)
  } finally {
    zero(deviceSecret)
  }
}

/** Cached PUBLIC addresses (no auth required - they are not secrets to the app). */
export async function getStoredAddresses(): Promise<WalletAddresses | null> {
  const raw = await SecureStore.getItemAsync(KEY_ADDRESSES, SECURE_OPTS)
  if (!raw) return null
  try {
    return JSON.parse(raw) as WalletAddresses
  } catch {
    return null
  }
}

/** Wipe everything. Irreversible. */
export async function destroyVault(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEY_DEVICE_SECRET),
    SecureStore.deleteItemAsync(KEY_BLOB),
    SecureStore.deleteItemAsync(KEY_ADDRESSES),
    SecureStore.deleteItemAsync(KEY_ATTEMPTS),
    SecureStore.deleteItemAsync(KEY_SETTINGS),
  ])
}

/* ---------------------------------- Settings ---------------------------------- */

export interface WalletSettings {
  biometricsEnabled: boolean
  /** Auto-lock timeout in seconds. */
  autoLockSeconds: number
}

const DEFAULT_SETTINGS: WalletSettings = {
  biometricsEnabled: false,
  autoLockSeconds: 60,
}

export async function getSettings(): Promise<WalletSettings> {
  const raw = await SecureStore.getItemAsync(KEY_SETTINGS, SECURE_OPTS)
  if (!raw) return DEFAULT_SETTINGS
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<WalletSettings>) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export async function setSettings(settings: WalletSettings): Promise<void> {
  await SecureStore.setItemAsync(KEY_SETTINGS, JSON.stringify(settings), SECURE_OPTS)
}
