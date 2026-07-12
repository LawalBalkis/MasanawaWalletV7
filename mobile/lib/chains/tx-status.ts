/**
 * Transaction confirmation checks over public RPC. Read-only - sees only
 * tx hashes and public data. Pure TS (fetch only) - testable in Node.
 */
import { CHAINS, type ChainConfig } from "./config"
import { fetchWithTimeout, rpcCall } from "./rpc"
import type { ActivityStatus } from "../storage/activity"

/* ------------------------------ EVM ------------------------------ */

async function evmStatus(chain: ChainConfig, hash: string): Promise<ActivityStatus> {
  const receipt = await rpcCall<{ status?: string } | null>(chain.rpcUrl, "eth_getTransactionReceipt", [hash]).catch(
    (e: Error) => {
      // "Empty RPC result" means result === null -> still pending.
      if (e.message.includes("Empty RPC result")) return null
      throw e
    },
  )
  if (receipt == null) return "pending"
  return receipt.status === "0x1" ? "confirmed" : "failed"
}

/* ----------------------------- Solana ----------------------------- */

async function solanaStatus(chain: ChainConfig, signature: string): Promise<ActivityStatus> {
  const res = await rpcCall<{
    value: Array<{ confirmationStatus?: string; err: unknown } | null>
  }>(chain.rpcUrl, "getSignatureStatuses", [[signature], { searchTransactionHistory: true }])
  const info = res.value?.[0]
  if (info == null) return "pending"
  if (info.err != null) return "failed"
  return info.confirmationStatus === "confirmed" || info.confirmationStatus === "finalized" ? "confirmed" : "pending"
}

/* ------------------------------ TRON ------------------------------ */

async function tronStatus(chain: ChainConfig, txId: string): Promise<ActivityStatus> {
  const res = await fetchWithTimeout(`${chain.rpcUrl}/wallet/gettransactioninfobyid`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: txId }),
  })
  if (!res.ok) throw new Error(`TronGrid ${res.status}`)
  const info = (await res.json()) as {
    blockNumber?: number
    result?: string
    receipt?: { result?: string }
  }
  // TronGrid returns {} until the tx is included in a block.
  if (info.blockNumber == null) return "pending"
  if (info.result === "FAILED") return "failed"
  // Smart-contract txs carry a receipt result; plain transfers do not.
  if (info.receipt?.result && info.receipt.result !== "SUCCESS") return "failed"
  return "confirmed"
}

/* ----------------------------- Entry point ----------------------------- */

/**
 * Check one transaction's on-chain status. Throws on network failure -
 * callers should keep the previous status in that case.
 */
export async function fetchTxStatus(chainId: string, hash: string): Promise<ActivityStatus> {
  const chain = CHAINS.find((c) => c.id === chainId)
  if (!chain) throw new Error(`Unknown chain: ${chainId}`)
  if (chain.kind === "evm") return evmStatus(chain, hash)
  if (chain.kind === "solana") return solanaStatus(chain, hash)
  return tronStatus(chain, hash)
}

/**
 * Check many pending entries in parallel; individual failures are
 * ignored (entry keeps its previous status). Returns only changes.
 */
export async function checkPendingStatuses(
  pending: Array<{ id: string; chainId: string; hash: string }>,
): Promise<Record<string, ActivityStatus>> {
  const updates: Record<string, ActivityStatus> = {}
  await Promise.all(
    pending.map(async (p) => {
      try {
        const status = await fetchTxStatus(p.chainId, p.hash)
        if (status !== "pending") updates[p.id] = status
      } catch {
        // Network hiccup - leave as pending.
      }
    }),
  )
  return updates
}
