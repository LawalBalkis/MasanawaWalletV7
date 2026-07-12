/**
 * SPL token transfer built and signed from scratch (no @solana/web3.js):
 * associated-token-account (PDA) derivation, a generic legacy message
 * compiler, and the SPL `TransferChecked` + idempotent-create-ATA
 * instructions. Pure TS - testable in Node.
 */
import { ed25519 } from "@noble/curves/ed25519.js"
import { sha256 } from "@noble/hashes/sha2.js"
import bs58 from "bs58"
import { concatBytes, utf8ToBytes } from "../../crypto/bytes"
import { encodeShortVecLength } from "./solana"

export const TOKEN_PROGRAM_ID = bs58.decode("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
export const ASSOCIATED_TOKEN_PROGRAM_ID = bs58.decode("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
export const SYSTEM_PROGRAM_ID = bs58.decode("11111111111111111111111111111111")

const PDA_MARKER = utf8ToBytes("ProgramDerivedAddress")

/** True if `bytes` decodes to a valid ed25519 curve point. */
function isOnCurve(bytes: Uint8Array): boolean {
  try {
    ;(ed25519 as unknown as { Point: { fromBytes: (b: Uint8Array) => unknown } }).Point.fromBytes(bytes)
    return true
  } catch {
    return false
  }
}

/**
 * Find a program-derived address for `seeds` under `programId`, walking the
 * bump seed down from 255 until the hash lands off-curve (a valid PDA).
 */
export function findProgramAddress(seeds: Uint8Array[], programId: Uint8Array): Uint8Array {
  for (let bump = 255; bump >= 0; bump--) {
    const hash = sha256(concatBytes(...seeds, new Uint8Array([bump]), programId, PDA_MARKER))
    if (!isOnCurve(hash)) return hash
  }
  throw new Error("Unable to find a viable program address bump")
}

/** Associated token account for (owner, mint) under the SPL token program. */
export function deriveAssociatedTokenAddress(owner: Uint8Array, mint: Uint8Array): Uint8Array {
  return findProgramAddress([owner, TOKEN_PROGRAM_ID, mint], ASSOCIATED_TOKEN_PROGRAM_ID)
}

/* --------------------------- Message compiler --------------------------- */

export interface AccountMeta {
  pubkey: Uint8Array
  isSigner: boolean
  isWritable: boolean
}

export interface Instruction {
  programId: Uint8Array
  keys: AccountMeta[]
  data: Uint8Array
}

interface MergedMeta {
  pubkey: Uint8Array
  base58: string
  isSigner: boolean
  isWritable: boolean
}

/**
 * Compile a legacy Solana message from instructions. `payer` is the fee
 * payer and sole required signer here. Accounts are ordered per the
 * runtime's rules: writable-signers, readonly-signers, writable-nonsigners,
 * readonly-nonsigners. Program ids are added as readonly non-signers.
 */
export function compileMessage(payer: Uint8Array, instructions: Instruction[], recentBlockhash: Uint8Array): Uint8Array {
  const metas = new Map<string, MergedMeta>()

  const upsert = (pubkey: Uint8Array, isSigner: boolean, isWritable: boolean) => {
    const base58 = bs58.encode(pubkey)
    const existing = metas.get(base58)
    if (existing) {
      existing.isSigner = existing.isSigner || isSigner
      existing.isWritable = existing.isWritable || isWritable
    } else {
      metas.set(base58, { pubkey, base58, isSigner, isWritable })
    }
  }

  // Payer first, always signer + writable.
  upsert(payer, true, true)
  for (const ix of instructions) {
    for (const key of ix.keys) upsert(key.pubkey, key.isSigner, key.isWritable)
    upsert(ix.programId, false, false)
  }

  const payerB58 = bs58.encode(payer)
  const all = [...metas.values()]
  const rank = (m: MergedMeta) => (m.isSigner ? (m.isWritable ? 0 : 1) : m.isWritable ? 2 : 3)
  all.sort((a, b) => {
    if (a.base58 === payerB58) return -1
    if (b.base58 === payerB58) return 1
    return rank(a) - rank(b)
  })

  const numRequiredSignatures = all.filter((m) => m.isSigner).length
  const numReadonlySigned = all.filter((m) => m.isSigner && !m.isWritable).length
  const numReadonlyUnsigned = all.filter((m) => !m.isSigner && !m.isWritable).length

  const indexOf = (pubkey: Uint8Array) => {
    const idx = all.findIndex((m) => m.base58 === bs58.encode(pubkey))
    if (idx < 0) throw new Error("Account missing from compiled key table")
    return idx
  }

  const accountKeysBlob = concatBytes(encodeShortVecLength(all.length), ...all.map((m) => m.pubkey))

  const ixBlobs = instructions.map((ix) => {
    const accountIndexes = ix.keys.map((k) => indexOf(k.pubkey))
    return concatBytes(
      new Uint8Array([indexOf(ix.programId)]),
      encodeShortVecLength(accountIndexes.length),
      new Uint8Array(accountIndexes),
      encodeShortVecLength(ix.data.length),
      ix.data,
    )
  })

  return concatBytes(
    new Uint8Array([numRequiredSignatures, numReadonlySigned, numReadonlyUnsigned]),
    accountKeysBlob,
    recentBlockhash,
    encodeShortVecLength(instructions.length),
    ...ixBlobs,
  )
}

/* ----------------------------- Instructions ----------------------------- */

function u64Le(value: bigint): Uint8Array {
  const out = new Uint8Array(8)
  new DataView(out.buffer).setBigUint64(0, value, true)
  return out
}

/** SPL `TransferChecked` (index 12). */
export function transferCheckedInstruction(
  source: Uint8Array,
  mint: Uint8Array,
  destination: Uint8Array,
  owner: Uint8Array,
  amount: bigint,
  decimals: number,
): Instruction {
  return {
    programId: TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data: concatBytes(new Uint8Array([12]), u64Le(amount), new Uint8Array([decimals])),
  }
}

/** Associated Token Account `CreateIdempotent` (index 1). No-op if it exists. */
export function createIdempotentAtaInstruction(
  payer: Uint8Array,
  ata: Uint8Array,
  owner: Uint8Array,
  mint: Uint8Array,
): Instruction {
  return {
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: ata, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: new Uint8Array([1]),
  }
}

/**
 * Build the SPL transfer message. If `createDestAta` is set, an idempotent
 * create-ATA instruction is prepended so first-time recipients work.
 */
export function buildSplTransferMessage(params: {
  ownerPubkey: Uint8Array
  mint: Uint8Array
  sourceAta: Uint8Array
  destOwner: Uint8Array
  destAta: Uint8Array
  amount: bigint
  decimals: number
  recentBlockhash: Uint8Array
  createDestAta: boolean
}): Uint8Array {
  const instructions: Instruction[] = []
  if (params.createDestAta) {
    instructions.push(createIdempotentAtaInstruction(params.ownerPubkey, params.destAta, params.destOwner, params.mint))
  }
  instructions.push(
    transferCheckedInstruction(
      params.sourceAta,
      params.mint,
      params.destAta,
      params.ownerPubkey,
      params.amount,
      params.decimals,
    ),
  )
  return compileMessage(params.ownerPubkey, instructions, params.recentBlockhash)
}
