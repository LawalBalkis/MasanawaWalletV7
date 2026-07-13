import { AdminHeader, StatCard } from '@/components/admin/primitives'
import { requireAdmin } from '@/lib/auth/session'
import { formatNgn } from '@/lib/wallet/assets'
import { walletStore } from '@/lib/wallet/store'

export default async function AdminReportsPage() {
  await requireAdmin()
  const [fees, liabilities, dailyFlow] = await Promise.all([
    walletStore.getFeeRevenueReport(),
    walletStore.getLiabilitiesReport(),
    walletStore.getDailyFlowReport(30),
  ])

  const totalFees = fees.reduce((sum, f) => sum + f.totalFeesNgn, 0)
  const totalLiabilitiesNgn = liabilities.reduce((sum, l) => sum + l.ngnValue, 0)
  const totalInflow = dailyFlow.reduce((sum, d) => sum + d.inflowNgn, 0)
  const totalOutflow = dailyFlow.reduce((sum, d) => sum + d.outflowNgn, 0)

  function csvUrl(data: Record<string, unknown>[], filename: string) {
    if (data.length === 0) return ''
    const headers = Object.keys(data[0])
    const rows = data.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminHeader
        title="Reports"
        description="Fee revenue, platform liabilities, and 30-day inflow/outflow. Export as CSV."
      />

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total fees collected" value={formatNgn(totalFees)} />
        <StatCard label="Total liabilities (NGN)" value={formatNgn(totalLiabilitiesNgn)} />
        <StatCard label="30-day inflow" value={formatNgn(totalInflow)} />
        <StatCard label="30-day outflow" value={formatNgn(totalOutflow)} />
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Fee revenue by asset</h2>
          {fees.length > 0 && (
            <a
              href={csvUrl(fees as any, 'fee-revenue.csv')}
              download="fee-revenue.csv"
              className="text-sm text-primary hover:underline"
            >
              Export CSV
            </a>
          )}
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Asset</th>
                <th className="px-5 py-3 text-right font-medium">Total fees (NGN)</th>
                <th className="px-5 py-3 text-right font-medium">Transactions</th>
              </tr>
            </thead>
            <tbody>
              {fees.length === 0 ? (
                <tr><td colSpan={3} className="px-5 py-6 text-center text-muted-foreground">No fee revenue recorded.</td></tr>
              ) : fees.map((f) => (
                <tr key={f.asset} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-3 font-medium">{f.asset}</td>
                  <td className="px-5 py-3 text-right font-mono">{formatNgn(f.totalFeesNgn)}</td>
                  <td className="px-5 py-3 text-right font-mono">{f.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Liabilities by asset</h2>
          {liabilities.length > 0 && (
            <a
              href={csvUrl(liabilities as any, 'liabilities.csv')}
              download="liabilities.csv"
              className="text-sm text-primary hover:underline"
            >
              Export CSV
            </a>
          )}
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Asset</th>
                <th className="px-5 py-3 text-right font-medium">Total amount</th>
                <th className="px-5 py-3 text-right font-medium">NGN value</th>
              </tr>
            </thead>
            <tbody>
              {liabilities.length === 0 ? (
                <tr><td colSpan={3} className="px-5 py-6 text-center text-muted-foreground">No liabilities recorded.</td></tr>
              ) : liabilities.map((l) => (
                <tr key={l.asset} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-3 font-medium">{l.asset}</td>
                  <td className="px-5 py-3 text-right font-mono">{l.totalAmount.toFixed(4)}</td>
                  <td className="px-5 py-3 text-right font-mono">{formatNgn(l.ngnValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">30-day flow</h2>
          {dailyFlow.length > 0 && (
            <a
              href={csvUrl(dailyFlow as any, 'daily-flow.csv')}
              download="daily-flow.csv"
              className="text-sm text-primary hover:underline"
            >
              Export CSV
            </a>
          )}
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 text-right font-medium">Inflow (NGN)</th>
                  <th className="px-5 py-3 text-right font-medium">Outflow (NGN)</th>
                </tr>
              </thead>
              <tbody>
                {dailyFlow.length === 0 ? (
                  <tr><td colSpan={3} className="px-5 py-6 text-center text-muted-foreground">No flow data.</td></tr>
                ) : dailyFlow.map((d) => (
                  <tr key={d.date} className="border-b border-border last:border-b-0">
                    <td className="px-5 py-3 font-mono text-xs">{d.date}</td>
                    <td className="px-5 py-3 text-right font-mono text-success">{formatNgn(d.inflowNgn)}</td>
                    <td className="px-5 py-3 text-right font-mono text-destructive">{formatNgn(d.outflowNgn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
