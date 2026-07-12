/**
 * Shared JSON-RPC + HTTP helpers for chain calls. Pure TS (fetch only).
 */
const FETCH_TIMEOUT_MS = 20_000

export async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export async function rpcCall<T>(url: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  })
  if (!res.ok) throw new Error(`RPC ${res.status}`)
  const json = (await res.json()) as { result?: T; error?: { message: string } }
  if (json.error) throw new Error(json.error.message)
  if (json.result === undefined) throw new Error("Empty RPC result")
  return json.result
}
