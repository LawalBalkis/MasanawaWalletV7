/**
 * Ephemeral in-memory holder for the mnemonic during onboarding, so it
 * never travels through navigation params (which can be serialized or
 * logged). Cleared as soon as the vault is created or the flow is
 * abandoned.
 */
let pendingMnemonic: string | null = null

export function setPendingMnemonic(mnemonic: string): void {
  pendingMnemonic = mnemonic
}

export function getPendingMnemonic(): string | null {
  return pendingMnemonic
}

export function clearPendingMnemonic(): void {
  pendingMnemonic = null
}
