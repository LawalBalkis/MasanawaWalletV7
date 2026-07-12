/**
 * EIP-1559 (type 2) transaction building and signing, from scratch:
 * minimal RLP encoder + keccak256 + secp256k1 (audited @noble libs).
 * Pure TS - testable in Node.
 */
import { secp256k1 } from "@noble/curves/secp256k1.js"
import { keccak_256 } from "@noble/hashes/sha3.js"
import { bytesToHex, concatBytes, hexToBytes, zero } from "../../crypto/bytes"

/* ------------------------------- RLP ------------------------------- */

export type RlpInput = Uint8Array | RlpInput[]

/** Minimal big-endian byte encoding of a bigint (empty for 0), per RLP. */
export function bigintToMinimalBytes(value: bigint): Uint8Array {
  if (value < 0n) throw new Error("RLP integers must be non-negative")
  if (value === 0n) return new Uint8Array(0)
  let hex = value.toString(16)
  if (hex.length % 2 !== 0) hex = "0" + hex
  return hexToBytes(hex)
}

function encodeLength(length: number, offset: number): Uint8Array {
  if (length < 56) return new Uint8Array([offset + length])
  const lenBytes = bigintToMinimalBytes(BigInt(length))
  return concatBytes(new Uint8Array([offset + 55 + lenBytes.length]), lenBytes)
}

/** RLP-encode a byte string or (nested) list of byte strings. */
export function rlpEncode(input: RlpInput): Uint8Array {
  if (input instanceof Uint8Array) {
    if (input.length === 1 && input[0] < 0x80) return input
    return concatBytes(encodeLength(input.length, 0x80), input)
  }
  const encodedItems = input.map(rlpEncode)
  const payload = concatBytes(...encodedItems)
  return concatBytes(encodeLength(payload.length, 0xc0), payload)
}

/* --------------------------- EIP-1559 tx --------------------------- */

export interface Eip1559Fields {
  chainId: bigint
  nonce: bigint
  maxPriorityFeePerGas: bigint
  maxFeePerGas: bigint
  gasLimit: bigint
  /** 0x-prefixed 20-byte recipient. */
  to: string
  /** Value in wei. */
  value: bigint
  /** Optional 0x-prefixed calldata (e.g. an ERC-20 transfer). */
  data?: string
}

const TX_TYPE = new Uint8Array([0x02])

function unsignedFieldList(tx: Eip1559Fields): RlpInput[] {
  return [
    bigintToMinimalBytes(tx.chainId),
    bigintToMinimalBytes(tx.nonce),
    bigintToMinimalBytes(tx.maxPriorityFeePerGas),
    bigintToMinimalBytes(tx.maxFeePerGas),
    bigintToMinimalBytes(tx.gasLimit),
    hexToBytes(tx.to),
    bigintToMinimalBytes(tx.value),
    tx.data ? hexToBytes(tx.data) : new Uint8Array(0), // data
    [], // accessList
  ]
}

/** keccak256(0x02 || rlp(unsigned fields)) - the digest that gets signed. */
export function eip1559SigningHash(tx: Eip1559Fields): Uint8Array {
  return keccak_256(concatBytes(TX_TYPE, rlpEncode(unsignedFieldList(tx))))
}

/**
 * Sign and serialize a type-2 transaction. Returns the 0x-prefixed raw
 * tx hex ready for eth_sendRawTransaction. Does NOT zero `privateKey` -
 * caller owns it.
 */
export function signEip1559(tx: Eip1559Fields, privateKey: Uint8Array): string {
  const digest = eip1559SigningHash(tx)
  // format "recovered" = [recoveryByte, r(32), s(32)]; lowS is the default (required by EVM).
  const sig = secp256k1.sign(digest, privateKey, { prehash: false, format: "recovered" })
  try {
    const yParity = BigInt(sig[0])
    const r = BigInt("0x" + bytesToHex(sig.subarray(1, 33)))
    const s = BigInt("0x" + bytesToHex(sig.subarray(33, 65)))
    const signed = [
      ...unsignedFieldList(tx),
      bigintToMinimalBytes(yParity),
      bigintToMinimalBytes(r),
      bigintToMinimalBytes(s),
    ]
    return "0x" + bytesToHex(concatBytes(TX_TYPE, rlpEncode(signed)))
  } finally {
    zero(sig)
  }
}

/** keccak256 of the raw signed tx = the transaction hash. */
export function evmTxHash(rawTxHex: string): string {
  return "0x" + bytesToHex(keccak_256(hexToBytes(rawTxHex)))
}
