/**
 * Activity feed hook: loads the persisted log and, while any entry is
 * pending, polls public RPC for confirmations and persists the result.
 * SWR keeps every consumer (activity screen, asset screens) in sync.
 */
import useSWR from "swr"
import { getActivity, updateActivityStatuses, type ActivityEntry } from "./storage/activity"
import { checkPendingStatuses } from "./chains/tx-status"

const POLL_INTERVAL_MS = 12_000

async function loadAndReconcile(): Promise<ActivityEntry[]> {
  const entries = await getActivity()
  const pending = entries.filter((e) => e.status === "pending")
  if (pending.length === 0) return entries
  const updates = await checkPendingStatuses(pending)
  if (Object.keys(updates).length === 0) return entries
  return updateActivityStatuses(updates)
}

export function useActivity() {
  const { data, isLoading, mutate } = useSWR("activity", loadAndReconcile, {
    refreshInterval: (latest) => (latest?.some((e) => e.status === "pending") ? POLL_INTERVAL_MS : 0),
    revalidateOnFocus: false,
  })
  return { entries: data ?? [], isLoading, mutate }
}
