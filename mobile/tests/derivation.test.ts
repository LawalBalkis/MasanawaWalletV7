/**
 * Crypto layer verification against known test vectors.
 * Run: pnpm test:vectors  (uses tsx, Node only - no Expo needed)
 */
import { mnemonicToSeed, isValidMnemonic, createMnemonic, suggestWords } from "../lib/crypto/mnemonic"
import {
  deriveEvmAddress,
  deriveSolanaAddress,
  deriveTronAddress,
  toChecksumAddress,
} from "../lib/crypto/derivation"
import { encryptVault, decryptVault, parseVault, serializeVault } from "../lib/crypto/encryption"
import { bytesToHex, utf8ToBytes, zero } from "../lib/crypto/bytes"
import { randomBytes as nodeRandomBytes } from "node:crypto"

let failures = 0
function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected
  if (!ok) failures++
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`)
  if (!ok) {
    console.log(`      expected: ${expected}`)
    console.log(`      actual:   ${actual}`)
  }
}

// --- Vector 1: the standard "abandon ... about" test mnemonic ---
const MNEMONIC_1 = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"

check("BIP39 validate (good checksum)", isValidMnemonic(MNEMONIC_1), true)
check(
  "BIP39 validate (bad checksum)",
  isValidMnemonic("abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon"),
  false,
)

const seed1 = mnemonicToSeed(MNEMONIC_1)
check(
  "BIP39 seed (official vector)",
  bytesToHex(seed1).slice(0, 32),
  // First 16 bytes of the official BIP39 seed for this mnemonic (no passphrase)
  "5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc1".slice(0, 32),
)

// EVM: m/44'/60'/0'/0/0 -> well-known address for this mnemonic (MetaMask default)
check("EVM address vector", deriveEvmAddress(seed1), "0x9858EfFD232B4033E47d90003D41EC34EcaEda94")

// Solana: m/44'/501'/0'/0' -> well-known Phantom/Sollet address for this mnemonic
check("Solana address vector", deriveSolanaAddress(seed1), "HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk")

// TRON: m/44'/195'/0'/0/0 -> well-known TronLink address for this mnemonic
check("TRON address vector", deriveTronAddress(seed1), "TUEZSdKsoDHQMeZwihtdoBiN46zxhGWYdH")

zero(seed1)

// --- EIP-55 checksum vectors (from the EIP) ---
check(
  "EIP-55 checksum 1",
  toChecksumAddress("5aaeb6053f3e94c9b9a09f33669435e7ef1beaed"),
  "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
)
check(
  "EIP-55 checksum 2",
  toChecksumAddress("fb6916095ca1df60bb79ce92ce3ea74c37c5d359"),
  "0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359",
)

// --- Mnemonic generation sanity ---
const generated = createMnemonic()
check("Generated mnemonic is 12 words", generated.split(" ").length, 12)
check("Generated mnemonic validates", isValidMnemonic(generated), true)
check("Autocomplete 'aba' -> abandon", suggestWords("aba")[0], "abandon")

// --- Vault encryption round trip ---
const deviceSecret = nodeRandomBytes(32)
const plaintext = utf8ToBytes(MNEMONIC_1)
const vault = encryptVault(plaintext, "123456", deviceSecret, (n) => new Uint8Array(nodeRandomBytes(n)))
const parsed = parseVault(serializeVault(vault))
const decrypted = decryptVault(parsed, "123456", deviceSecret)
check("Vault round trip", new TextDecoder().decode(decrypted), MNEMONIC_1)
zero(decrypted)

let wrongPinRejected = false
try {
  decryptVault(parsed, "654321", deviceSecret)
} catch {
  wrongPinRejected = true
}
check("Wrong PIN rejected (GCM auth)", wrongPinRejected, true)

let wrongSecretRejected = false
try {
  decryptVault(parsed, "123456", new Uint8Array(nodeRandomBytes(32)))
} catch {
  wrongSecretRejected = true
}
check("Wrong device secret rejected", wrongSecretRejected, true)

console.log(failures === 0 ? "\nAll tests passed." : `\n${failures} test(s) FAILED.`)
process.exit(failures === 0 ? 0 : 1)
