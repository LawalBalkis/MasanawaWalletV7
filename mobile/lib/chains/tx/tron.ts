/**
 * TRON transaction signing. TronGrid's /wallet/createtransaction builds
 * the raw transaction; we verify its txID locally (sha256 of raw_data_hex)
 * and sign it with secp256k1. Pure TS - testable in Node.
 */
import { secp256k1 } from "@noble/curves/secp256k1.js"
import { sha256 } from "@noble/hashes/sha2.js"
import { bytesToHex, hexToBytes, zero } from "../../crypto/bytes"

/** txID is sha256 of the protobuf-serialized raw_data. */
export function tronTxId(rawDataHex: string): string {
  return bytesToHex(sha256(hexToBytes(rawDataHex)))
}

/**
 * Sign a TRON transaction. Verifies the server-provided txID against a
 * locally computed hash of raw_data_hex before signing, so we never sign
 * a digest we did not derive ourselves.
 * Returns the 65-byte r||s||v signature hex. Does NOT zero `privateKey`.
 */
export function signTron(rawDataHex: string, expectedTxId: string, privateKey: Uint8Array): string {
  const digestHex = tronTxId(rawDataHex)
  if (digestHex !== expectedTxId.toLowerCase()) {
    throw new Error("Transaction ID mismatch - refusing to sign")
  }
  const digest = hexToBytes(digestHex)
  // format "recovered" = [recoveryByte, r(32), s(32)]; TRON wants r||s||v.
  const sig = secp256k1.sign(digest, privateKey, { prehash: false, format: "recovered" })
  try {
    return bytesToHex(sig.subarray(1)) + bytesToHex(sig.subarray(0, 1))
  } finally {
    zero(sig)
  }
}
