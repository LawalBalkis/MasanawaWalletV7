/**
 * Live RPC smoke test against well-known public addresses.
 * Run: pnpm tsx tests/balances.test.ts
 */
import { fetchAllBalances, formatUnits } from "../lib/chains/balances"

// Well-known, high-activity public addresses (read-only lookups).
const ADDRESSES = {
  evm: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", // vitalik.eth
  solana: "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1", // Raydium pool authority
  tron: "TKHuVq1oKVruCGLvqVexFs6dawKv6fQgFs", // known active TRON address
}

check("formatUnits 1 ETH", formatUnits(10n ** 18n, 18), "1")
check("formatUnits 1.5 ETH", formatUnits(15n * 10n ** 17n, 18), "1.5")
check("formatUnits dust", formatUnits(1n, 18), "0")

function check(name: string, actual: unknown, expected: unknown) {
  console.log(`${actual === expected ? "PASS" : "FAIL"}  ${name} (${actual})`)
}

async function main() {
  const results = await fetchAllBalances(ADDRESSES)
  let failures = 0
  for (const r of results) {
    const ok = !r.error && Number.parseFloat(r.formatted) >= 0
    if (!ok) failures++
    console.log(
      `${ok ? "PASS" : "FAIL"}  ${r.chainId}: ${r.formatted}${r.usd != null ? ` ($${r.usd.toFixed(2)})` : ""}${r.error ? ` error=${r.error}` : ""}`,
    )
  }
  console.log(failures === 0 ? "\nAll balance fetches succeeded." : `\n${failures} chain(s) failed.`)
  process.exit(failures === 0 ? 0 : 1)
}

main()
