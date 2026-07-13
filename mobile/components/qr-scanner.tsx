import { useCallback, useEffect, useRef, useState } from "react"
import { Modal, Pressable, StyleSheet, Text, View } from "react-native"
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera"
import { Button } from "./button"
import { colors, radius, spacing, type } from "../lib/theme"

interface QrScannerProps {
  visible: boolean
  /** Called with the raw QR payload. Return an error message to keep scanning, or null to close. */
  onScan: (data: string) => string | null
  onClose: () => void
}

/**
 * Full-screen QR scanner modal. Keeps scanning until `onScan` accepts the
 * payload (returns null) or the user closes it.
 */
export function QrScanner({ visible, onScan, onClose }: QrScannerProps) {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanError, setScanError] = useState<string | null>(null)
  // Debounce: the camera fires the same code many times per second.
  const lastPayload = useRef<string | null>(null)

  useEffect(() => {
    if (visible) {
      setScanError(null)
      lastPayload.current = null
      if (permission && !permission.granted && permission.canAskAgain) {
        void requestPermission()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const handleScan = useCallback(
    (result: BarcodeScanningResult) => {
      const data = result.data?.trim()
      if (!data || data === lastPayload.current) return
      lastPayload.current = data
      const error = onScan(data)
      if (error) {
        setScanError(error)
        // Allow re-scanning the same code after a short pause.
        setTimeout(() => {
          lastPayload.current = null
        }, 1500)
      }
    },
    [onScan],
  )

  const denied = permission != null && !permission.granted && !permission.canAskAgain

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={handleScan}
          />
        ) : (
          <View style={styles.permissionBody}>
            <Text style={[type.heading, styles.centerText]}>Camera access needed</Text>
            <Text style={[type.caption, styles.centerText]}>
              {denied
                ? "Camera permission was denied. Enable it in your device settings to scan QR codes."
                : "Allow camera access to scan a recipient address QR code."}
            </Text>
            {!denied && <Button label="Allow camera" onPress={() => void requestPermission()} />}
          </View>
        )}

        {permission?.granted && (
          <View style={styles.overlay} pointerEvents="box-none">
            <Text style={[type.body, styles.centerText, styles.hint]}>Point the camera at an address QR code</Text>
            <View style={styles.frame} />
            {scanError && (
              <View style={styles.errorPill}>
                <Text style={styles.errorText}>{scanError}</Text>
              </View>
            )}
          </View>
        )}

        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close scanner"
          style={styles.closeButton}
        >
          <Text style={styles.closeText}>{"\u2715"}</Text>
        </Pressable>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  permissionBody: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  frame: {
    width: 240,
    height: 240,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: "transparent",
  },
  hint: {
    color: colors.foreground,
  },
  errorPill: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
  closeButton: {
    position: "absolute",
    top: 56,
    right: spacing.xl,
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: colors.foreground,
    fontSize: 18,
  },
  centerText: {
    textAlign: "center",
  },
})
