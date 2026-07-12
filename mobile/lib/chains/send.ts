/**
 * Native-asset send: fee estimation, signing and broadcast per chain.
 * Key material enters ONLY through `sendNative(...)`'s mnemonic argument,
 * is used transiently to derive the per-chain key, and everything is
 * zeroed in `finally` blocks. Pure TS (fetch only) - testable in Node.
 */
import bs58 from "bs58"
import type { ChainConfig } from "./config"
import { formatUnits } from "./balances"
import { fetchWithTimeout, rpcCall } from "./rpc"
import { signEip1559, evmTxHash, type Eip1559Fields } from "./tx/evm"
import { buildTransferMessage, signSolanaTransfer } from "./tx/solana"
import { signTron } from "./tx/tron"
import { mnemonicToSeed } from "../crypto/mnemonic"
import { deriveSecp256k1PrivateKey, deriveSolanaPrivateKey, DERIVATION_PATHS } from "../crypto/derivation"
import { zero } from "../crypto/bytes"

export const EVM_TRANSFER_GAS = 21_000n
/** Flat Solana base fee for a single-signature transaction (lamports). */
const SOLANA_BASE_FEE = 5_000n

/* ------------------------------ Fees ------------------------------ */

export interface FeeEstimate {
  /** Max fee in the chain's smallest unit. */
  raw: bigint
  /** Human-readable fee in the chain's native symbol. */
  formatted: string
  /** Extra note shown in the UI (e.g. L1 data fee caveat). */
  note?: string
}

export interface EvmFees {
  maxPriorityFeePerGas: bigint
  maxFeePerGas: bigint
}

export async function fetchEvmFees(chain: ChainConfig): Promise<EvmFees> {
  const [block, tipHex] = await Promise.all([
    rpcCall<{ baseFeePerGas?: string }>(chain.rpcUrl, "eth_getBlockByNumber", ["latest", false]),
    rpcCall<string>(chain.rpcUrl, "eth_maxPriorityFeePerGas", []).catch(() => null),
  ])
  if (!block.baseFeePerGas) throw new Error("Chain does not support EIP-1559")
  const baseFee = BigInt(block.baseFeePerGas)
  const tip = tipHex ? BigInt(tipHex) : 1_000_000_000n // 1 gwei fallback
  // Headroom for base-fee growth while the tx is pending.
  return { maxPriorityFeePerGas: tip, maxFeePerGas: baseFee * 2n + tip }
}

const L2_CHAIN_IDS = new Set(["base", "arbitrum", "optimism"])

export async function estimateFee(chain: ChainConfig): Promise<FeeEstimate> {
  if (chain.kind === "evm") {
    const fees = await fetchEvmFees(chain)
    const raw = EVM_TRANSFER_GAS * fees.maxFeePerGas
    return {
      raw,
      formatted: `${formatUnits(raw, chain.decimals)} ${chain.symbol}`,
      note: L2_CHAIN_IDS.has(chain.id) ? "Max fee. An additional small L1 data fee may apply." : "Max fee. The actual fee is usually lower.",
    }
  }
  if (chain.kind === "solana") {
    return {
      raw: SOLANA_BASE_FEE,
      formatted: `${formatUnits(SOLANA_BASE_FEE, chain.decimals)} ${chain.symbol}`,
    }
  }
  // TRON: bandwidth usually covers simple transfers; TRX is burned otherwise.
  return {
    raw: 0n,
    formatted: `~0 ${chain.symbol}`,
    note: "Free with daily bandwidth. Up to ~0.3 TRX is burned if bandwidth is exhausted.",
  }
}

/** Largest sendable amount given the balance and the fee estimate. */
export function maxSendable(balanceRaw: bigint, fee: FeeEstimate): bigint {
  const max = balanceRaw - fee.raw
  return max > 0n ? max : 0n
}

/* ---------------------------- Broadcast ---------------------------- */

async function sendEvm(chain: ChainConfig, from: string, to: string, amountRaw: bigint, privateKey: Uint8Array): Promise<string> {
  const [nonceHex, fees] = await Promise.all([
    rpcCall<string>(chain.rpcUrl, "eth_getTransactionCount", [from, "pending"]),
    fetchEvmFees(chain),
  ])
  const tx: Eip1559Fields = {
    chainId: BigInt(chain.evmChainId!),
    nonce: BigInt(nonceHex),
    maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
    maxFeePerGas: fees.maxFeePerGas,
    gasLimit: EVM_TRANSFER_GAS,
    to,
    value: amountRaw,
  }
  const rawTx = signEip1559(tx, privateKey)
  const hash = await rpcCall<string>(chain.rpcUrl, "eth_sendRawTransaction", [rawTx])
  return hash ?? evmTxHash(rawTx)
}

async function sendSolana(chain: ChainConfig, from: string, to: string, amountRaw: bigint, privateKey: Uint8Array): Promise<string> {
  const { value } = await rpcCall<{ value: { blockhash: string } }>(chain.rpcUrl, "getLatestBlockhash", [
    { commitment: "finalized" },
  ])
  const message = buildTransferMessage(bs58.decode(from), bs58.decode(to), amountRaw, bs58.decode(value.blockhash))
  const { serializedBase64, signatureBase58 } = signSolanaTransfer(message, privateKey)
  const sig = await rpcCall<string>(chain.rpcUrl, "sendTransaction", [
    serializedBase64,
    { encoding: "base64", preflightCommitment: "confirmed" },
  ])
  return sig ?? signatureBase58
}

async function sendTron(chain: ChainConfig, from: string, to: string, amountRaw: bigint, privateKey: Uint8Array): Promise<string> {
  const createRes = await fetchWithTimeout(`${chain.rpcUrl}/wallet/createtransaction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ owner_address: from, to_address: to, amount: Number(amountRaw), visible: true }),
  })
  if (!createRes.ok) throw new Error(`TronGrid ${createRes.status}`)
  const tx = (await createRes.json()) as {
    txID?: string
    raw_data_hex?: string
    Error?: string
  }
  if (tx.Error || !tx.txID || !tx.raw_data_hex) throw new Error(tx.Error ?? "Failed to build TRON transaction")

  const signature = signTron(tx.raw_data_hex, tx.txID, privateKey)

  const broadcastRes = await fetchWithTimeout(`${chain.rpcUrl}/wallet/broadcasttransaction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...tx, signature: [signature] }),
  })
  if (!broadcastRes.ok) throw new Error(`TronGrid ${broadcastRes.status}`)
  const result = (await broadcastRes.json()) as { result?: boolean; code?: string; message?: string }
  if (!result.result) {
    // TronGrid hex-encodes error messages.
    const message = result.message ? tryDecodeHexAscii(result.message) : (result.code ?? "Broadcast failed")
    throw new Error(message)
  }
  return tx.txID
}

function tryDecodeHexAscii(hex: string): string {
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) return hex
  let out = ""
  for (let i = 0; i < hex.length; i += 2) {
    out += String.fromCharCode(Number.parseInt(hex.slice(i, i + 2), 16))
  }
  return out
}

/* ----------------------------- Entry point ----------------------------- */

/**
 * Sign and broadcast a native-asset transfer. Derives the chain key from
 * the mnemonic transiently and zeroes all key material before returning.
 * Returns the transaction hash / signature.
 */
export async function sendNative(
  chain: ChainConfig,
  from: string,
  to: string,
  amountRaw: bigint,
  mnemonic: string,
): Promise<string> {
  const seed = mnemonicToSeed(mnemonic)
  let privateKey: Uint8Array | null = null
  try {
    if (chain.kind === "solana") {
      privateKey = deriveSolanaPrivateKey(seed)
      return await sendSolana(chain, from, to, amountRaw, privateKey)
    }
    if (chain.kind === "tron") {
      privateKey = deriveSecp256k1PrivateKey(seed, DERIVATION_PATHS.tron)
      return await sendTron(chain, from, to, amountRaw, privateKey)
    }
    privateKey = deriveSecp256k1PrivateKey(seed, DERIVATION_PATHS.evm)
    return await sendEvm(chain, from, to, amountRaw, privateKey)
  } finally {
    zero(seed, privateKey)
  }
}
