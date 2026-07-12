/**
 * Token (ERC-20 / SPL / TRC-20) fee estimation, signing and broadcast.
 * Mirrors the safety model of ./send.ts: key material enters only via the
 * mnemonic argument, is derived transiently, and zeroed in `finally`.
 * Pure TS (fetch only) - testable in Node.
 */
import bs58 from "bs58"
import type { ChainConfig } from "./config"
import type { TokenConfig } from "./tokens"
import { formatUnits } from "./balances"
import { fetchWithTimeout, rpcCall } from "./rpc"
import { fetchEvmFees, type FeeEstimate } from "./send"
import { encodeTransfer } from "./tx/erc20"
import { signEip1559, evmTxHash, type Eip1559Fields } from "./tx/evm"
import { signSolanaTransfer } from "./tx/solana"
import {
  buildSplTransferMessage,
  deriveAssociatedTokenAddress,
} from "./tx/solana-token"
import { signTron } from "./tx/tron"
import { mnemonicToSeed } from "../crypto/mnemonic"
import { deriveSecp256k1PrivateKey, deriveSolanaPrivateKey, DERIVATION_PATHS } from "../crypto/derivation"
import { bytesToHex, zero } from "../crypto/bytes"

/** Fallback gas if estimation fails (typical ERC-20 transfer ~45-65k). */
const ERC20_GAS_FALLBACK = 90_000n
/** Rent-exempt minimum a new SPL token account needs (~0.00204 SOL). */
const ATA_RENT_LAMPORTS = 2_039_280n
const SOLANA_BASE_FEE = 5_000n

/* ------------------------------ Helpers ------------------------------ */

/** TRON base58 -> 20-byte hex (drops 0x41 prefix), left-padded to 32 bytes. */
function tronAddressToAbiWord(base58Address: string): string {
  const decoded = bs58.decode(base58Address)
  return bytesToHex(decoded.subarray(1, 21)).padStart(64, "0")
}

function uint256Word(value: bigint): string {
  return value.toString(16).padStart(64, "0")
}

async function estimateErc20Gas(chain: ChainConfig, from: string, data: string, token: string): Promise<bigint> {
  try {
    const hex = await rpcCall<string>(chain.rpcUrl, "eth_estimateGas", [{ from, to: token, data }])
    // 25% headroom for state-dependent gas variance.
    return (BigInt(hex) * 125n) / 100n
  } catch {
    return ERC20_GAS_FALLBACK
  }
}

/* ------------------------------ Fees ------------------------------ */

/**
 * Estimate the network fee for a token transfer. `createsAta` (Solana)
 * adds the rent deposit a brand-new recipient token account requires.
 */
export async function estimateTokenFee(
  chain: ChainConfig,
  token: TokenConfig,
  from: string,
  to: string,
  createsAta = false,
): Promise<FeeEstimate> {
  if (chain.kind === "evm") {
    const data = encodeTransfer(to, 1n) // amount doesn't affect transfer gas
    const [fees, gas] = await Promise.all([fetchEvmFees(chain), estimateErc20Gas(chain, from, data, token.address)])
    const raw = gas * fees.maxFeePerGas
    return { raw, formatted: `${formatUnits(raw, chain.decimals)} ${chain.symbol}` }
  }
  if (chain.kind === "solana") {
    const raw = SOLANA_BASE_FEE + (createsAta ? ATA_RENT_LAMPORTS : 0n)
    return {
      raw,
      formatted: `${formatUnits(raw, chain.decimals)} ${chain.symbol}`,
      note: createsAta ? "Includes a one-time ~0.002 SOL deposit to create the recipient's token account." : undefined,
    }
  }
  return {
    raw: 0n,
    formatted: `~0 ${chain.symbol}`,
    note: "Paid in TRX energy. Roughly 5-30 TRX depending on network conditions.",
  }
}

/* ---------------------------- Broadcast ---------------------------- */

async function sendErc20(
  chain: ChainConfig,
  token: TokenConfig,
  from: string,
  to: string,
  amountRaw: bigint,
  privateKey: Uint8Array,
): Promise<string> {
  const data = encodeTransfer(to, amountRaw)
  const [nonceHex, fees, gas] = await Promise.all([
    rpcCall<string>(chain.rpcUrl, "eth_getTransactionCount", [from, "pending"]),
    fetchEvmFees(chain),
    estimateErc20Gas(chain, from, data, token.address),
  ])
  const tx: Eip1559Fields = {
    chainId: BigInt(chain.evmChainId!),
    nonce: BigInt(nonceHex),
    maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
    maxFeePerGas: fees.maxFeePerGas,
    gasLimit: gas,
    to: token.address,
    value: 0n,
    data,
  }
  const rawTx = signEip1559(tx, privateKey)
  const hash = await rpcCall<string>(chain.rpcUrl, "eth_sendRawTransaction", [rawTx])
  return hash ?? evmTxHash(rawTx)
}

async function accountExists(chain: ChainConfig, address: string): Promise<boolean> {
  const res = await rpcCall<{ value: unknown }>(chain.rpcUrl, "getAccountInfo", [address, { encoding: "base64" }])
  return res.value != null
}

async function sendSpl(
  chain: ChainConfig,
  token: TokenConfig,
  from: string,
  to: string,
  amountRaw: bigint,
  privateKey: Uint8Array,
): Promise<string> {
  const ownerPubkey = bs58.decode(from)
  const destOwner = bs58.decode(to)
  const mint = bs58.decode(token.address)
  const sourceAta = deriveAssociatedTokenAddress(ownerPubkey, mint)
  const destAta = deriveAssociatedTokenAddress(destOwner, mint)

  const [{ value }, destExists] = await Promise.all([
    rpcCall<{ value: { blockhash: string } }>(chain.rpcUrl, "getLatestBlockhash", [{ commitment: "finalized" }]),
    accountExists(chain, bs58.encode(destAta)),
  ])

  const message = buildSplTransferMessage({
    ownerPubkey,
    mint,
    sourceAta,
    destOwner,
    destAta,
    amount: amountRaw,
    decimals: token.decimals,
    recentBlockhash: bs58.decode(value.blockhash),
    createDestAta: !destExists,
  })
  const { serializedBase64, signatureBase58 } = signSolanaTransfer(message, privateKey)
  const sig = await rpcCall<string>(chain.rpcUrl, "sendTransaction", [
    serializedBase64,
    { encoding: "base64", preflightCommitment: "confirmed" },
  ])
  return sig ?? signatureBase58
}

async function sendTrc20(
  chain: ChainConfig,
  token: TokenConfig,
  from: string,
  to: string,
  amountRaw: bigint,
  privateKey: Uint8Array,
): Promise<string> {
  const parameter = tronAddressToAbiWord(to) + uint256Word(amountRaw)
  const createRes = await fetchWithTimeout(`${chain.rpcUrl}/wallet/triggersmartcontract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      owner_address: from,
      contract_address: token.address,
      function_selector: "transfer(address,uint256)",
      parameter,
      fee_limit: 100_000_000,
      call_value: 0,
      visible: true,
    }),
  })
  if (!createRes.ok) throw new Error(`TronGrid ${createRes.status}`)
  const built = (await createRes.json()) as {
    transaction?: { txID?: string; raw_data_hex?: string }
    result?: { result?: boolean; message?: string }
  }
  const tx = built.transaction
  if (!tx?.txID || !tx.raw_data_hex) {
    throw new Error(built.result?.message ? tryDecodeHexAscii(built.result.message) : "Failed to build TRC-20 transfer")
  }

  const signature = signTron(tx.raw_data_hex, tx.txID, privateKey)
  const broadcastRes = await fetchWithTimeout(`${chain.rpcUrl}/wallet/broadcasttransaction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...tx, signature: [signature] }),
  })
  if (!broadcastRes.ok) throw new Error(`TronGrid ${broadcastRes.status}`)
  const result = (await broadcastRes.json()) as { result?: boolean; code?: string; message?: string }
  if (!result.result) {
    throw new Error(result.message ? tryDecodeHexAscii(result.message) : (result.code ?? "Broadcast failed"))
  }
  return tx.txID
}

function tryDecodeHexAscii(hex: string): string {
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) return hex
  let out = ""
  for (let i = 0; i < hex.length; i += 2) out += String.fromCharCode(Number.parseInt(hex.slice(i, i + 2), 16))
  return out
}

/* ----------------------------- Entry point ----------------------------- */

/**
 * Sign and broadcast a token transfer. Derives the chain key transiently
 * and zeroes all key material before returning. Returns the tx hash / sig.
 */
export async function sendToken(
  chain: ChainConfig,
  token: TokenConfig,
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
      return await sendSpl(chain, token, from, to, amountRaw, privateKey)
    }
    if (chain.kind === "tron") {
      privateKey = deriveSecp256k1PrivateKey(seed, DERIVATION_PATHS.tron)
      return await sendTrc20(chain, token, from, to, amountRaw, privateKey)
    }
    privateKey = deriveSecp256k1PrivateKey(seed, DERIVATION_PATHS.evm)
    return await sendErc20(chain, token, from, to, amountRaw, privateKey)
  } finally {
    zero(seed, privateKey)
  }
}
