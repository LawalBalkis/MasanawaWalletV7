'use server'

import 'server-only'

import { generateId } from '@/lib/auth/crypto'
import { requireAdmin } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'
import { formatAsset, type AssetSymbol } from '@/lib/wallet/assets'
import { walletStore } from '@/lib/wallet/store'

export interface AdminP2PResult {
  ok: boolean
  error?: string
}

function fail(error: string): AdminP2PResult {
  return { ok: false, error }
}

export async function resolveDisputeAction(input: {
  disputeId: string
  resolution: 'resolved_release' | 'resolved_refund'
  note: string
}): Promise<AdminP2PResult> {
  const admin = await requireAdmin()
  if (!input.note.trim()) return fail('A resolution note is required.')

  const disputes = await walletStore.listP2PDisputes({ status: 'open' })
  const dispute = disputes.find((d) => d.id === input.disputeId)
  if (!dispute) return fail('Dispute not found or already resolved.')

  const order = await walletStore.getP2POrder(dispute.orderId)
  if (!order) return fail('Order not found.')

  const now = new Date().toISOString()

  if (input.resolution === 'resolved_release') {
    // Release escrow to buyer
    const buyerId = order.takerId
    await walletStore.addTransactions([
      {
        id: generateId('tx'),
        userId: buyerId,
        type: 'escrow_release',
        asset: order.asset as AssetSymbol,
        amount: order.amount,
        ngnValue: order.totalMsn,
        note: `Escrow released by admin ${admin.name}: ${input.note.trim()}`,
        status: 'completed',
        date: now,
      },
    ])
    await walletStore.updateEscrowHold(order.escrowHoldId!, { status: 'released', resolvedAt: now })
    await walletStore.updateP2POrder(order.id, { status: 'completed', completedAt: now })
  } else {
    // Refund escrow to seller
    const sellerId = order.makerId
    await walletStore.addTransactions([
      {
        id: generateId('tx'),
        userId: sellerId,
        type: 'escrow_refund',
        asset: order.asset as AssetSymbol,
        amount: order.amount,
        ngnValue: order.totalMsn,
        note: `Escrow refunded by admin ${admin.name}: ${input.note.trim()}`,
        status: 'completed',
        date: now,
      },
    ])
    await walletStore.updateEscrowHold(order.escrowHoldId!, { status: 'refunded', resolvedAt: now })
    await walletStore.updateP2POrder(order.id, { status: 'cancelled' })
  }

  await walletStore.updateP2PDispute(dispute.id, {
    status: input.resolution,
    resolvedById: admin.id,
    resolutionNote: input.note.trim(),
    resolvedAt: now,
  })

  // Notify both parties
  const [maker, taker] = await Promise.all([
    walletStore.getUserById(order.makerId),
    walletStore.getUserById(order.takerId),
  ])
  const resolutionText = input.resolution === 'resolved_release'
    ? 'released to the buyer'
    : 'refunded to the seller'

  if (maker) {
    await walletStore.addNotification({
      userId: maker.id,
      title: 'Dispute resolved',
      body: `Your P2P dispute has been resolved — escrow ${resolutionText}. Note: ${input.note.trim()}`,
    })
  }
  if (taker) {
    await walletStore.addNotification({
      userId: taker.id,
      title: 'Dispute resolved',
      body: `Your P2P dispute has been resolved — escrow ${resolutionText}. Note: ${input.note.trim()}`,
    })
  }

  revalidatePath('/admin', 'layout')
  return { ok: true }
}
