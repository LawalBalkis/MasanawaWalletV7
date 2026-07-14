import { requireUser } from '@/lib/auth/session'
import { formatAsset, formatMsn, type AssetSymbol } from '@/lib/wallet/assets'
import { walletStore } from '@/lib/wallet/store'
import { notFound } from 'next/navigation'
import { OrderRoomClient } from './order-room-client'

export default async function OrderRoomPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireUser()
  const { id } = await params
  const order = await walletStore.getP2POrder(id)
  if (!order) notFound()
  if (order.makerId !== user.id && order.takerId !== user.id) notFound()

  const [maker, taker, messages] = await Promise.all([
    walletStore.getUserById(order.makerId),
    walletStore.getUserById(order.takerId),
    walletStore.listP2PMessages(id),
  ])

  const isBuyer = order.takerId === user.id
  const counterparty = isBuyer ? maker : taker
  const counterpartyRole = isBuyer ? 'Seller' : 'Buyer'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Order {order.id.slice(0, 16)}…
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {counterpartyRole}: @{counterparty?.username} · {formatAsset(order.amount, { symbol: order.asset as AssetSymbol, decimals: 8 })} at {formatMsn(order.priceMsn)}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Asset</p>
            <p className="mt-1 font-semibold text-foreground">{order.asset}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Amount</p>
            <p className="mt-1 font-mono text-sm text-foreground">{order.amount}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Total</p>
            <p className="mt-1 font-mono text-sm text-foreground">{formatMsn(order.totalMsn)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Fee</p>
            <p className="mt-1 font-mono text-sm text-foreground">{formatMsn(order.feeMsn)}</p>
          </div>
        </div>
        <div className="mt-4">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${
            order.status === 'completed' ? 'bg-success/10 text-success' :
            order.status === 'open' ? 'bg-warning/10 text-warning' :
            order.status === 'disputed' ? 'bg-destructive/10 text-destructive' :
            'bg-muted text-muted-foreground'
          }`}>
            {order.status.toUpperCase()}
          </span>
        </div>
      </div>

      <OrderRoomClient
        order={{
          id: order.id,
          status: order.status,
          isBuyer,
          totalMsn: order.totalMsn,
          feeMsn: order.feeMsn,
          amount: order.amount,
          asset: order.asset,
        }}
        messages={messages.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          body: m.body,
          createdAt: m.createdAt,
        }))}
        userId={user.id}
      />
    </div>
  )
}
