'use server'

// ---------------------------------------------------------------------------
// P2P Escrow Engine — server-only.
//
// Handles offer creation, order opening (with escrow lock), instant atomic
// settlement, cancellation, and dispute opening. All money movement goes
// through the WalletStore ledger boundary; escrow holds are tracked in
// dedicated tables for auditability.
//
// Settlement modes:
//   Instant (default): buyer's MSN debited + seller's crypto released atomically.
//   Manual-confirm:    kept in the state machine for future off-platform legs.
// ---------------------------------------------------------------------------
import { generateId } from '@/lib/auth/crypto'
import { rateLimit } from '@/lib/auth/rate-limit'
import { requireUser } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'
import {
  FEES,
  assetMeta,
  formatAsset,
  formatMsn,
  formatNgn,
  type AssetSymbol,
} from '@/lib/wallet/assets'
import { getNgnRates } from '@/lib/wallet/prices'
import { walletStore, type LedgerTx } from '@/lib/wallet/store'
import { VERIFICATION_TIERS } from '@/lib/wallet/tiers'

export interface P2PResult {
  ok: boolean
  error?: string
  offerId?: string
  orderId?: string
}

function fail(error: string): P2PResult {
  return { ok: false, error }
}

function refresh() {
  revalidatePath('/dashboard', 'layout')
}

const CRYPTO_ASSETS: AssetSymbol[] = ['USDT', 'USDC', 'BTC', 'ETH', 'SOL']
const ORDER_TIMEOUT_MINUTES = 15
const PRICE_BOUND_PERCENT = 0.05 // ±5% of live market rate

// ---------------------------------------------------------------------------
// Offer management
// ---------------------------------------------------------------------------

export async function createOfferAction(input: {
  side: 'buy' | 'sell'
  asset: AssetSymbol
  priceMsn: number
  totalAmount: number
  minOrderMsn?: number
  maxOrderMsn?: number
  terms?: string
}): Promise<P2PResult> {
  const user = await requireUser()
  if (user.status === 'frozen') return fail('Frozen accounts cannot create offers.')
  if (!CRYPTO_ASSETS.includes(input.asset)) return fail('Invalid asset for P2P trading.')

  if (!(await rateLimit(`p2p_offer:${user.id}`, 10, 60 * 60_000))) {
    return fail('Too many offers in the last hour. Please slow down.')
  }

  const price = Math.round(input.priceMsn * 100) / 100
  const totalAmount = Math.round(input.totalAmount * 1e8) / 1e8
  if (price <= 0) return fail('Price must be positive.')
  if (totalAmount <= 0) return fail('Amount must be positive.')

  // Price bound check: clamp to ±5% of live market rate
  const rates = await getNgnRates()
  const marketRate = rates[input.asset]
  const lowerBound = marketRate * (1 - PRICE_BOUND_PERCENT)
  const upperBound = marketRate * (1 + PRICE_BOUND_PERCENT)
  if (price < lowerBound || price > upperBound) {
    return fail(
      `Price must be within ±5% of the market rate (${formatNgn(Math.round(marketRate))}/${input.asset}).`,
    )
  }

  // For sell offers: verify the seller has enough crypto
  if (input.side === 'sell') {
    const balances = await walletStore.getBalances(user.id)
    if (totalAmount > balances[input.asset as AssetSymbol]) {
      return fail(`You need ${formatAsset(totalAmount, assetMeta(input.asset))} but only hold ${formatAsset(balances[input.asset as AssetSymbol], assetMeta(input.asset))}.`)
    }
  }

  // Tier limit check
  const tier = VERIFICATION_TIERS[user.tier]
  const totalMsnValue = price * totalAmount
  if (tier.singleWithdrawalNgn !== null && totalMsnValue > tier.singleWithdrawalNgn) {
    return fail(`Offer size exceeds your tier limit of ${formatNgn(tier.singleWithdrawalNgn)}.`)
  }

  const offerId = generateId('p2p_off')
  const minOrder = Math.max(0, Math.round((input.minOrderMsn ?? 0) * 100) / 100)
  const maxOrder = Math.max(0, Math.round((input.maxOrderMsn ?? totalMsnValue) * 100) / 100)

  await walletStore.createP2POffer({
    id: offerId,
    makerId: user.id,
    side: input.side,
    asset: input.asset,
    priceMsn: price,
    totalAmount,
    remainingAmount: totalAmount,
    minOrderMsn: minOrder,
    maxOrderMsn: maxOrder,
    terms: input.terms?.trim() || null,
    status: 'active',
  })

  refresh()
  return { ok: true, offerId }
}

export async function pauseOfferAction(input: { offerId: string }): Promise<P2PResult> {
  const user = await requireUser()
  const offer = await walletStore.getP2POffer(input.offerId)
  if (!offer) return fail('Offer not found.')
  if (offer.makerId !== user.id) return fail('You can only pause your own offers.')

  await walletStore.updateP2POffer(input.offerId, { status: 'paused' })
  refresh()
  return { ok: true }
}

export async function closeOfferAction(input: { offerId: string }): Promise<P2PResult> {
  const user = await requireUser()
  const offer = await walletStore.getP2POffer(input.offerId)
  if (!offer) return fail('Offer not found.')
  if (offer.makerId !== user.id) return fail('You can only close your own offers.')

  await walletStore.updateP2POffer(input.offerId, { status: 'closed' })
  refresh()
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Order: open, pay (instant settle), cancel, dispute
// ---------------------------------------------------------------------------

export async function openOrderAction(input: {
  offerId: string
  amount: number
}): Promise<P2PResult> {
  const user = await requireUser()
  if (user.status === 'frozen') return fail('Frozen accounts cannot trade.')

  if (!(await rateLimit(`p2p_order:${user.id}`, 20, 60 * 60_000))) {
    return fail('Too many orders in the last hour. Please slow down.')
  }

  const offer = await walletStore.getP2POffer(input.offerId)
  if (!offer) return fail('Offer not found.')
  if (offer.status !== 'active') return fail('This offer is not active.')

  const amount = Math.round(input.amount * 1e8) / 1e8
  if (amount <= 0) return fail('Amount must be positive.')
  if (amount > offer.remainingAmount) return fail('Amount exceeds the offer\u2019s remaining supply.')

  const totalMsn = Math.round(offer.priceMsn * amount * 100) / 100
  if (offer.minOrderMsn > 0 && totalMsn < offer.minOrderMsn) {
    return fail(`Minimum order is ${formatMsn(offer.minOrderMsn)}.`)
  }
  if (offer.maxOrderMsn > 0 && totalMsn > offer.maxOrderMsn) {
    return fail(`Maximum order is ${formatMsn(offer.maxOrderMsn)}.`)
  }

  const isBuyer = offer.side === 'sell' // taker buys crypto, pays MSN
  const sellerId = isBuyer ? offer.makerId : user.id
  const buyerId = isBuyer ? user.id : offer.makerId

  // Verify the seller has enough crypto to lock
  const sellerBalances = await walletStore.getBalances(sellerId)
  if (amount > sellerBalances[offer.asset as AssetSymbol]) {
    return fail('The seller does not have enough crypto to fulfill this order.')
  }

  // Verify the buyer has enough MSN
  const buyerBalances = await walletStore.getBalances(buyerId)
  const fee = Math.max(totalMsn * FEES.tradeRate, FEES.tradeMinNgn)
  const totalDebit = totalMsn + fee
  if (totalDebit > buyerBalances.MSN) {
    return fail(`You need ${formatMsn(totalDebit)} (incl. fee) but only have ${formatMsn(buyerBalances.MSN)}.`)
  }

  // Tier limit
  const tier = VERIFICATION_TIERS[user.tier]
  if (tier.singleWithdrawalNgn !== null && totalMsn > tier.singleWithdrawalNgn) {
    return fail(`Order size exceeds your tier limit of ${formatNgn(tier.singleWithdrawalNgn)}.`)
  }

  const orderId = generateId('p2p_ord')
  const holdId = generateId('esc_h')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + ORDER_TIMEOUT_MINUTES * 60_000)

  // Lock the seller's crypto in escrow
  const lockTx: LedgerTx = {
    id: generateId('tx'),
    userId: sellerId,
    type: 'escrow_lock',
    asset: offer.asset as AssetSymbol,
    amount: -amount,
    ngnValue: totalMsn,
    note: `Escrow locked for order ${orderId}`,
    status: 'completed',
    date: now.toISOString(),
  }
  await walletStore.addTransactions([lockTx])

  await walletStore.createP2POrder({
    id: orderId,
    offerId: offer.id,
    makerId: offer.makerId,
    takerId: user.id,
    asset: offer.asset,
    amount,
    priceMsn: offer.priceMsn,
    totalMsn,
    feeMsn: fee,
    status: 'open',
    escrowHoldId: holdId,
    expiresAt: expiresAt.toISOString(),
  })

  await walletStore.createEscrowHold({
    id: holdId,
    orderId,
    ownerId: sellerId,
    asset: offer.asset,
    amount,
    status: 'held',
  })

  // Decrement offer remaining amount
  const newRemaining = Math.round((offer.remainingAmount - amount) * 1e8) / 1e8
  await walletStore.updateP2POffer(offer.id, {
    remainingAmount: newRemaining,
    status: newRemaining <= 0 ? 'closed' : 'active',
  })

  // Notify maker
  const maker = await walletStore.getUserById(offer.makerId)
  if (maker?.notifyTransactions) {
    await walletStore.addNotification({
      userId: maker.id,
      title: 'P2P order opened',
      body: `@${user.username} opened an order for ${formatAsset(amount, assetMeta(offer.asset as AssetSymbol))} at ${formatMsn(offer.priceMsn)}/${offer.asset}.`,
    })
  }

  refresh()
  return { ok: true, orderId }
}

export async function payOrderAction(input: {
  orderId: string
  pin: string
}): Promise<P2PResult> {
  const user = await requireUser()
  if (user.status === 'frozen') return fail('Frozen accounts cannot complete trades.')

  const { verifyPin } = await import('@/lib/auth/actions')
  const pinCheck = await verifyPin(input.pin)
  if (!pinCheck.ok) return fail(pinCheck.error ?? 'PIN verification failed.')

  const order = await walletStore.getP2POrder(input.orderId)
  if (!order) return fail('Order not found.')
  if (order.status !== 'open') return fail('This order is no longer open.')

  const isBuyer = order.takerId !== order.makerId ? order.takerId === user.id : false
  // In a sell offer: taker = buyer. In a buy offer: maker = seller, taker = buyer.
  const buyerId = order.takerId // taker is always the buyer in our model
  const sellerId = order.makerId

  if (user.id !== buyerId) return fail('Only the buyer can pay.')

  const balances = await walletStore.getBalances(buyerId)
  const totalDebit = order.totalMsn + order.feeMsn
  if (totalDebit > balances.MSN) {
    return fail(`Insufficient MSN. You need ${formatMsn(totalDebit)} but have ${formatMsn(balances.MSN)}.`)
  }

  const now = new Date().toISOString()

  // Atomic settlement: debit buyer MSN, credit seller MSN, release crypto to buyer
  const txs: LedgerTx[] = [
    {
      id: generateId('tx'),
      userId: buyerId,
      type: 'send',
      asset: 'MSN' as AssetSymbol,
      amount: -order.totalMsn,
      ngnValue: order.totalMsn,
      counterparty: `P2P trade ${order.id}`,
      note: `Paid for ${formatAsset(order.amount, assetMeta(order.asset as AssetSymbol))}`,
      status: 'completed',
      date: now,
    },
    {
      id: generateId('tx'),
      userId: sellerId,
      type: 'receive',
      asset: 'MSN' as AssetSymbol,
      amount: order.totalMsn,
      ngnValue: order.totalMsn,
      counterparty: `P2P trade ${order.id}`,
      note: `Received for ${formatAsset(order.amount, assetMeta(order.asset as AssetSymbol))}`,
      status: 'completed',
      date: now,
    },
    {
      id: generateId('tx'),
      userId: buyerId,
      type: 'escrow_release',
      asset: order.asset as AssetSymbol,
      amount: order.amount,
      ngnValue: order.totalMsn,
      counterparty: `@${(await walletStore.getUserById(sellerId))?.username ?? 'seller'}`,
      note: `Escrow released for order ${order.id}`,
      status: 'completed',
      date: now,
    },
  ]

  // Fee ledger entry
  if (order.feeMsn > 0) {
    txs.push({
      id: generateId('tx'),
      userId: buyerId,
      type: 'send',
      asset: 'MSN' as AssetSymbol,
      amount: -order.feeMsn,
      ngnValue: order.feeMsn,
      note: `P2P taker fee for order ${order.id}`,
      status: 'completed',
      date: now,
    })
  }

  await walletStore.addTransactions(txs)

  // Update order and escrow
  await walletStore.updateP2POrder(order.id, {
    status: 'completed',
    completedAt: now,
  })
  await walletStore.updateEscrowHold(order.escrowHoldId!, {
    status: 'released',
    resolvedAt: now,
  })

  // Notifications
  const seller = await walletStore.getUserById(sellerId)
  if (user.notifyTransactions) {
    await walletStore.addNotification({
      userId: buyerId,
      title: 'Trade completed',
      body: `You bought ${formatAsset(order.amount, assetMeta(order.asset as AssetSymbol))} for ${formatMsn(order.totalMsn)}.`,
    })
  }
  if (seller?.notifyTransactions) {
    await walletStore.addNotification({
      userId: sellerId,
      title: 'Trade completed',
      body: `You sold ${formatAsset(order.amount, assetMeta(order.asset as AssetSymbol))} for ${formatMsn(order.totalMsn)}.`,
    })
  }

  refresh()
  return { ok: true, orderId: order.id }
}

export async function cancelOrderAction(input: { orderId: string }): Promise<P2PResult> {
  const user = await requireUser()
  const order = await walletStore.getP2POrder(input.orderId)
  if (!order) return fail('Order not found.')
  if (order.status !== 'open') return fail('Only open orders can be cancelled.')
  if (order.makerId !== user.id && order.takerId !== user.id) {
    return fail('You can only cancel your own orders.')
  }

  const now = new Date().toISOString()
  const sellerId = order.makerId

  // Refund the escrowed crypto
  await walletStore.addTransactions([
    {
      id: generateId('tx'),
      userId: sellerId,
      type: 'escrow_refund',
      asset: order.asset as AssetSymbol,
      amount: order.amount,
      ngnValue: order.totalMsn,
      note: `Escrow refunded — order ${order.id} cancelled`,
      status: 'completed',
      date: now,
    },
  ])

  await walletStore.updateP2POrder(order.id, { status: 'cancelled' })
  await walletStore.updateEscrowHold(order.escrowHoldId!, {
    status: 'refunded',
    resolvedAt: now,
  })

  // Restore offer remaining amount
  const offer = await walletStore.getP2POffer(order.offerId)
  if (offer && offer.status !== 'closed') {
    const newRemaining = Math.round((offer.remainingAmount + order.amount) * 1e8) / 1e8
    await walletStore.updateP2POffer(offer.id, {
      remainingAmount: newRemaining,
      status: 'active',
    })
  }

  refresh()
  return { ok: true }
}

export async function disputeOrderAction(input: {
  orderId: string
  reason: string
}): Promise<P2PResult> {
  const user = await requireUser()
  const order = await walletStore.getP2POrder(input.orderId)
  if (!order) return fail('Order not found.')
  if (order.status !== 'open' && order.status !== 'paid') {
    return fail('Only active or paid orders can be disputed.')
  }
  if (order.makerId !== user.id && order.takerId !== user.id) {
    return fail('You can only dispute your own orders.')
  }
  if (!input.reason.trim()) return fail('A reason is required.')

  const disputeId = generateId('p2p_disp')
  await walletStore.createP2PDispute({
    id: disputeId,
    orderId: order.id,
    openedById: user.id,
    reason: input.reason.trim(),
    evidence: null,
    status: 'open',
  })

  await walletStore.updateP2POrder(order.id, { status: 'disputed' })

  refresh()
  return { ok: true }
}

export async function sendOrderMessageAction(input: {
  orderId: string
  body: string
}): Promise<P2PResult> {
  const user = await requireUser()
  const order = await walletStore.getP2POrder(input.orderId)
  if (!order) return fail('Order not found.')
  if (order.makerId !== user.id && order.takerId !== user.id) {
    return fail('You can only message in your own orders.')
  }
  if (!input.body.trim()) return fail('Message cannot be empty.')

  const msgId = generateId('p2p_msg')
  await walletStore.createP2PMessage({
    id: msgId,
    orderId: order.id,
    senderId: user.id,
    body: input.body.trim().slice(0, 500),
  })

  return { ok: true }
}
