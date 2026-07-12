/**
 * Offline unit vectors for token primitives (no network).
 * Run: pnpm tsx tests/tokens.test.ts
 */
import bs58 from "bs58"
import { encodeBalanceOf, encodeTransfer, selector, decodeUint } from "../lib/chains/tx/erc20"
import { deriveAssociatedTokenAddress, findProgramAddress } from "../lib/chains/tx/solana-token"
import { bytesToHex } from "../lib/crypto/bytes"

let failures = 0
function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected
  if (!ok) failures++
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n   expected ${expected}\n   actual   ${actual}`}`)
}

// ---- ERC-20 selectors (keccak256 of the signature, first 4 bytes) ----
check("balanceOf selector", bytesToHex(selector("balanceOf(address)")), "70a08231")
check("transfer selector", bytesToHex(selector("transfer(address,uint256)")), "a9059cbb")

// ---- balanceOf calldata: selector + 32-byte left-padded address ----
check(
  "encodeBalanceOf",
  encodeBalanceOf("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
  "0x70a08231000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa96045",
)

// ---- transfer calldata: selector + address + amount (1 USDC = 1_000_000) ----
check(
  "encodeTransfer",
  encodeTransfer("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", 1_000_000n),
  "0xa9059cbb000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa96045" +
    "00000000000000000000000000000000000000000000000000000000000f4240",
)

// ---- decodeUint round-trips a padded word ----
check("decodeUint", decodeUint("0x00000000000000000000000000000000000000000000000000000000000f4240").toString(), "1000000")

// ---- SPL associated token account (verified against @solana/spl-token) ----
check(
  "ATA derivation (DYw8.../USDC)",
  bs58.encode(
    deriveAssociatedTokenAddress(
      bs58.decode("DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK"),
      bs58.decode("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    ),
  ),
  "6wzzozWHyumGXyBgFpxnYkpoPN2fserASyYW3Yj882Br",
)

// ---- findProgramAddress is deterministic ----
const seeds = [bs58.decode("11111111111111111111111111111111")]
const prog = bs58.decode("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
check("findProgramAddress deterministic", bytesToHex(findProgramAddress(seeds, prog)), bytesToHex(findProgramAddress(seeds, prog)))

console.log(failures === 0 ? "\nAll token vectors passed." : `\n${failures} vector(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
