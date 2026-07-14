import { AdminHeader, relativeTime } from '@/components/admin/primitives'
import { requireAdmin } from '@/lib/auth/session'
import { walletStore } from '@/lib/wallet/store'
import { notFound } from 'next/navigation'
import { DisputeRoomClient } from './dispute-room-client'

export default async function AdminDisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await params

  const disputes = await walletStore.listP2PDisputes({ limit: 100 })
  const dispute = disputes.find((d) => d.id === id)
  if (!dispute) notFound()

  const [order, opener, messages] = await Promise.all([
    walletStore.getP2POrder(dispute.orderId),
    walletStore.getUserById(dispute.openedById),
    walletStore.listP2PMessages(dispute.orderId),
  ])

  if (!order) notFound()

  return (
    <div className="flex flex-col gap-6">
      <AdminHeader
        title="Dispute resolution"
        description="Review the evidence and resolve this dispute. The decision releases or refunds escrowed funds."
      />
      <DisputeRoomClient
        disputeId={dispute.id}
        orderId={dispute.orderId}
        reason={dispute.reason}
        openedByUsername={opener?.username ?? 'unknown'}
        messages={messages.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          body: m.body,
          createdAt: m.createdAt,
        }))}
      />
    </div>
  )
}
