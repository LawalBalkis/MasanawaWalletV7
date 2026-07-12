/**
 * Token (ERC-20 / SPL / TRC-20) balance reads over public RPCs.
 * Read-only: only ever sees public addresses. Pure TS (fetch only).
 */
import bs58 from "bs58"
import { CHAINS, type ChainConfig } from "./config"
import { TOKENS, type TokenConfig } from "./tokens"
import { formatUnits } from "./balances"
import { encodeBalanceOf, decodeUint } from "./tx/erc20"
import { bytesToHex } from "../crypto/bytes"
import type { WalletAddresses } from "../crypto/derivation"

export interface TokenBalance {
  tokenId: string
  chainId: string
  raw: string
  formatted: string
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

/* ------------------------------ EVM ------------------------------ */

async function fetchErc20Balance(chain: ChainConfig, token: TokenConfig, owner: string): Promise<bigint> {
  const res = await fetchWithTimeout(chain.rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to: token.address, data: encodeBalanceOf(owner) }, "latest"],
    }),
  })
  if (!res.ok) throw new Error(`RPC ${res.status}`)
  const json = (await res.json()) as { result?: string; error?: { message: string } }
  if (json.error) throw new Error(json.error.message)
  if (!json.result) throw new Error("Empty RPC result")
  return decodeUint(json.result)
}

/* ----------------------------- Solana ----------------------------- */

interface SplAccountsResult {
  value: { account: { data: { parsed: { info: { tokenAmount: { amount: string } } } } } }[]
}

async function fetchSplBalance(chain: ChainConfig, token: TokenConfig, owner: string): Promise<bigint> {
  const res = await fetchWithTimeout(chain.rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTokenAccountsByOwner",
      params: [owner, { mint: token.address }, { encoding: "jsonParsed" }],
    }),
  })
  if (!res.ok) throw new Error(`RPC ${res.status}`)
  const json = (await res.json()) as { result?: SplAccountsResult; error?: { message: string } }
  if (json.error) throw new Error(json.error.message)
  const accounts = json.result?.value ?? []
  let total = 0n
  for (const acc of accounts) {
    total += BigInt(acc.account.data.parsed.info.tokenAmount.amount)
  }
  return total
}

/* ------------------------------ TRON ------------------------------ */

/** TRON base58 address -> 20-byte hex (drops the 0x41 prefix), 32-byte padded. */
function tronAddressToAbiWord(base58Address: string): string {
  const decoded = bs58.decode(base58Address)
  const evm20 = decoded.subarray(1, 21) // drop 0x41 prefix + trailing checksum
  return bytesToHex(evm20).padStart(64, "0")
}

async function fetchTrc20Balance(chain: ChainConfig, token: TokenConfig, owner: string): Promise<bigint> {
  const res = await fetchWithTimeout(`${chain.rpcUrl}/wallet/triggerconstantcontract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      owner_address: owner,
      contract_address: token.address,
      function_selector: "balanceOf(address)",
      parameter: tronAddressToAbiWord(owner),
      visible: true,
    }),
  })
  if (!res.ok) throw new Error(`TronGrid ${res.status}`)
  const json = (await res.json()) as { constant_result?: string[]; result?: { message?: string } }
  const hex = json.constant_result?.[0]
  if (!hex) return 0n
  return decodeUint(hex)
}

/* --------------------------- Aggregation --------------------------- */

function ownerForToken(token: TokenConfig, addresses: WalletAddresses): string | null {
  const chain = CHAINS.find((c) => c.id === token.chainId)
  if (!chain) return null
  return addresses[chain.kind]
}

/**
 * Fetch every registered token balance in parallel. `prices` maps
 * coingeckoId -> fiat price (pass the shared portfolio price map so we
 * don't hit CoinGecko twice). Individual failures don't reject.
 */
export async function fetchAllTokenBalances(
  addresses: WalletAddresses,
  prices: Record<string, number>,
): Promise<TokenBalance[]> {
  return Promise.all(
    TOKENS.map(async (token): Promise<TokenBalance> => {
      const chain = CHAINS.find((c) => c.id === token.chainId)
      const owner = ownerForToken(token, addresses)
      if (!chain || !owner) {
        return { tokenId: token.id, chainId: token.chainId, raw: "0", formatted: "0", usd: null, error: "No address" }
      }
      try {
        let raw: bigint
        if (chain.kind === "evm") raw = await fetchErc20Balance(chain, token, owner)
        else if (chain.kind === "solana") raw = await fetchSplBalance(chain, token, owner)
        else raw = await fetchTrc20Balance(chain, token, owner)

        const formatted = formatUnits(raw, token.decimals)
        const price = prices[token.coingeckoId]
        const usd = price != null ? Number.parseFloat(formatted) * price : null
        return { tokenId: token.id, chainId: token.chainId, raw: raw.toString(), formatted, usd }
      } catch (e) {
        return {
          tokenId: token.id,
          chainId: token.chainId,
          raw: "0",
          formatted: "0",
          usd: null,
          error: e instanceof Error ? e.message : "Failed to fetch",
        }
      }
    }),
  )
}
