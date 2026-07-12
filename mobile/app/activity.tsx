import { Text } from "react-native"
import { Screen } from "../components/screen"
import { ActivityList } from "../components/activity-list"
import { useActivity } from "../lib/use-activity"
import { type } from "../lib/theme"

export default function Activity() {
  const { entries, isLoading } = useActivity()

  return (
    <Screen title="Activity">
      <Text style={type.caption}>
        Transactions sent from this wallet. Pending transactions update automatically. Tap one to view it on the block
        explorer.
      </Text>
      {isLoading && entries.length === 0 ? (
        <Text style={[type.caption, { textAlign: "center" }]}>Loading...</Text>
      ) : (
        <ActivityList entries={entries} />
      )}
    </Screen>
  )
}
