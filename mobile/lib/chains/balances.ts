/**
 * Balance fetching over public RPC endpoints. Read-only: these calls
 * only ever see public addresses, never key material.
 * Pure TS (fetch only) - testable in Node.
 */
import { CHAINS, COINGECKO_PRICE_URL, type ChainConfig } from "./config"
import type { WalletAddresses } from "../crypto/derivation"

export interface ChainBalance {
  chainId: string
  /** Balance in the chain's smallest unit, as a decimal string. */
  raw: string
  /** Human-readable balance (divided by decimals). */
  formatted: string
  /** USD value, if price was available. */
  usd: number | null
  error?: string
}

const FETCH_TIMEOUT_MS = 12_000

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/** Format a bigint raw amount with `decimals`, trimmed to 6 display decimals. */
export function formatUnits(raw: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals)
  const whole = raw / base
  const frac = raw % base
  if (frac === 0n) return whole.toString()
  const fracStr = frac.toString().padStart(decimals, "0").slice(0, 6).replace(/0+$/, "")
  return fracStr ? `${whole}.${fracStr}` : whole.toString()
}

/* ------------------------------ EVM ------------------------------ */

async function fetchEvmBalance(chain: ChainConfig, address: string): Promise<bigint> {
  const res = await fetchWithTimeout(chain.rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBalance",
      params: [address, "latest"],
    }),
  })
  if (!res.ok) throw new Error(`RPC ${res.status}`)
  const json = (await res.json()) as { result?: string; error?: { message: string } }
  if (json.error) throw new Error(json.error.message)
  if (!json.result) throw new Error("Empty RPC result")
  return BigInt(json.result)
}

/* ----------------------------- Solana ----------------------------- */

async function fetchSolanaBalance(chain: ChainConfig, address: string): Promise<bigint> {
  const res = await fetchWithTimeout(chain.rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getBalance",
      params: [address],
    }),
  })
  if (!res.ok) throw new Error(`RPC ${res.status}`)
  const json = (await res.json()) as { result?: { value: number }; error?: { message: string } }
  if (json.error) throw new Error(json.error.message)
  if (json.result == null) throw new Error("Empty RPC result")
  return BigInt(json.result.value)
}

/* ------------------------------ TRON ------------------------------ */

async function fetchTronBalance(chain: ChainConfig, address: string): Promise<bigint> {
  const res = await fetchWithTimeout(`${chain.rpcUrl}/wallet/getaccount`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, visible: true }),
  })
  if (!res.ok) throw new Error(`RPC ${res.status}`)
  const json = (await res.json()) as { balance?: number }
  // TronGrid returns {} for accounts that have never been activated.
  return BigInt(json.balance ?? 0)
}

/* --------------------------- Aggregation --------------------------- */

function addressForChain(chain: ChainConfig, addresses: WalletAddresses): string {
  switch (chain.kind) {
    case "evm":
      return addresses.evm
    case "solana":
      return addresses.solana
    case "tron":
      return addresses.tron
  }
}

/** USD prices for all chains via CoinGecko public API (no key). */
export async function fetchPrices(): Promise<Record<string, number>> {
  const ids = [...new Set(CHAINS.map((c) => c.coingeckoId))].join(",")
  try {
    const res = await fetchWithTimeout(`${COINGECKO_PRICE_URL}?ids=${ids}&vs_currencies=usd`)
    if (!res.ok) return {}
    const json = (await res.json()) as Record<string, { usd?: number }>
    const out: Record<string, number> = {}
    for (const [id, v] of Object.entries(json)) {
      if (typeof v?.usd === "number") out[id] = v.usd
    }
    return out
  } catch {
    return {}
  }
}

/** Fetch all chain balances in parallel. Individual failures don't reject. */
export async function fetchAllBalances(addresses: WalletAddresses): Promise<ChainBalance[]> {
  const prices = await fetchPrices()
  return Promise.all(
    CHAINS.map(async (chain): Promise<ChainBalance> => {
      const address = addressForChain(chain, addresses)
      try {
        let raw: bigint
        if (chain.kind === "evm") raw = await fetchEvmBalance(chain, address)
        else if (chain.kind === "solana") raw = await fetchSolanaBalance(chain, address)
        else raw = await fetchTronBalance(chain, address)

        const formatted = formatUnits(raw, chain.decimals)
        const price = prices[chain.coingeckoId]
        const usd = price != null ? Number.parseFloat(formatted) * price : null
        return { chainId: chain.id, raw: raw.toString(), formatted, usd }
      } catch (e) {
        return {
          chainId: chain.id,
          raw: "0",
          formatted: "0",
          usd: null,
          error: e instanceof Error ? e.message : "Failed to fetch",
        }
      }
    }),
  )
}
