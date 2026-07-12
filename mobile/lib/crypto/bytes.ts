/**
 * Byte-level helpers with an emphasis on in-memory hygiene.
 * Pure TS - no React Native / Expo imports so it is testable in Node.
 */

/** Zero a buffer in place. Call in `finally` blocks after using key material. */
export function zero(...buffers: (Uint8Array | null | undefined)[]): void {
  for (const buf of buffers) {
    if (buf) buf.fill(0)
  }
}

export function bytesToHex(bytes: Uint8Array): string {
  let hex = ""
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0")
  }
  return hex
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex
  if (clean.length % 2 !== 0) throw new Error("Invalid hex string")
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) {
    const byte = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16)
    if (Number.isNaN(byte)) throw new Error("Invalid hex string")
    out[i] = byte
  }
  return out
}

export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) {
    out.set(a, offset)
    offset += a.length
  }
  return out
}

export function utf8ToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}
