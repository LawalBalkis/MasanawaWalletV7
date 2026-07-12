import "react-native-get-random-values"
import { useEffect } from "react"
import { Stack, useRouter, useSegments } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { WalletProvider, useWallet } from "../lib/wallet-context"
import { colors } from "../lib/theme"

/**
 * Route gate. Keeps navigation in sync with wallet status:
 * - no wallet  -> onboarding stack (/welcome, /create-*, /import-wallet, /set-pin)
 * - locked     -> /unlock
 * - unlocked   -> main app (/home, /receive, /settings)
 */
function Gate({ children }: { children: React.ReactNode }) {
  const { status } = useWallet()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return
    const current = segments[0] ?? ""
    const onboardingRoutes = ["welcome", "create-backup", "create-verify", "import-wallet", "set-pin"]
    const mainRoutes = ["home", "receive", "settings"]

    if (status === "no-wallet" && !onboardingRoutes.includes(current)) {
      router.replace("/welcome")
    } else if (status === "locked" && current !== "unlock") {
      router.replace("/unlock")
    } else if (status === "unlocked" && !mainRoutes.includes(current)) {
      router.replace("/home")
    }
  }, [status, segments, router])

  return <>{children}</>
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <WalletProvider>
        <Gate>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: "fade",
            }}
          />
        </Gate>
      </WalletProvider>
    </SafeAreaProvider>
  )
}
