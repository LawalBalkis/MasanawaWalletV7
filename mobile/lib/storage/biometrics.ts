/**
 * Biometric unlock.
 *
 * When enabled, the user's PIN is stored in a SEPARATE SecureStore entry
 * gated with `requireAuthentication: true`, so the OS only releases it
 * after a successful biometric prompt (Android Keystore user-auth-bound
 * key / iOS Keychain access control). PIN entry always remains available
 * as a fallback, and disabling biometrics deletes this entry.
 */
import * as SecureStore from "expo-secure-store"
import * as LocalAuthentication from "expo-local-authentication"

const KEY_BIO_PIN = "vault.bio.pin"

export async function biometricsAvailable(): Promise<boolean> {
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ])
  return hasHardware && isEnrolled
}

/** Enable biometric unlock by storing the PIN behind OS biometric auth. */
export async function enableBiometricUnlock(pin: string): Promise<boolean> {
  if (!(await biometricsAvailable())) return false
  try {
    await SecureStore.setItemAsync(KEY_BIO_PIN, pin, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      requireAuthentication: true,
      authenticationPrompt: "Enable biometric unlock",
    })
    return true
  } catch {
    return false
  }
}

export async function disableBiometricUnlock(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY_BIO_PIN)
  } catch {
    // Entry may not exist; nothing to do.
  }
}

/**
 * Attempt biometric unlock. Triggers the OS biometric prompt and, on
 * success, returns the stored PIN for vault decryption. Returns null on
 * cancel/failure (caller falls back to PIN entry).
 */
export async function biometricUnlock(): Promise<string | null> {
  try {
    const pin = await SecureStore.getItemAsync(KEY_BIO_PIN, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      requireAuthentication: true,
      authenticationPrompt: "Unlock your wallet",
    })
    return pin
  } catch {
    return null
  }
}
