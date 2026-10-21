'use client';

import { useState } from 'react';
import { Select } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminAnalytics, useAdminDashboard, type Period } from '@/hooks/use-admin';
import { formatMWK } from '@/lib/format';
import { AdminHeader, StatCard, Td, Th, TableShell } from './admin-shell';
import { SalesChart } from './sales-chart';

export function AdminDashboard() {
  const dash = useAdminDashboard();
  return (
    <div className="space-y-10">
      <AdminHeader eyebrow="Overview" title="Today at a glance" />
      {dash.isLoading ? <Skeleton className="h-32 w-full" /> : null}
      {dash.data ? (
        <div className="grid gap-px bg-ink-line sm:grid-cols-3 xl:grid-cols-5">
          <StatCard label="Today's revenue" value={formatMWK(dash.data.todayRevenue)} tone="gold" />
          <StatCard label="To fulfil" value={dash.data.pendingFulfilment} />
          <StatCard label="Awaiting payment" value={dash.data.awaitingPayment} />
          <StatCard label="Low stock" value={dash.data.lowStock} tone={dash.data.lowStock > 0 ? 'danger' : undefined} />
          <StatCard label="Customers" value={dash.data.customers} />
        </div>
      ) : null}
      <AnalyticsPanel />
    </div>
  );
}

export function AnalyticsPanel() {
  const [period, setPeriod] = useState<Period>('daily');
  const analytics = useAdminAnalytics(period);
  const a = analytics.data;
  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="font-display text-2xl">Sales</p>
        <Select aria-label="Period" className="w-44 py-2" value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
          <option value="daily">Last 30 days</option>
          <option value="weekly">Last 12 weeks</option>
          <option value="monthly">Last 12 months</option>
          <option value="yearly">Last 5 years</option>
        </Select>
      </div>
      {analytics.isLoading || !a ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <>
          <div className="grid gap-px bg-ink-line sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Revenue" value={formatMWK(a.totals.revenue)} tone="gold" />
            <StatCard label="Orders" value={a.totals.orders} />
            <StatCard label="Average order" value={formatMWK(a.totals.averageOrderValue)} />
            <StatCard label="New customers" value={a.totals.newCustomers} />
            <StatCard label="Conversion" value={`${(a.totals.conversionRate * 100).toFixed(1)}%`} />
          </div>
          <SalesChart series={a.series} />
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <p className="eyebrow mb-4">Best sellers</p>
              <TableShell>
                <thead><tr><Th>Product</Th><Th className="text-right">Units</Th><Th className="text-right">Revenue</Th></tr></thead>
                <tbody>
                  {a.bestSellers.map((b) => (
                    <tr key={b._id}><Td>{b.name}</Td><Td className="text-right">{b.units}</Td><Td className="text-right">{formatMWK(b.revenue)}</Td></tr>
                  ))}
                </tbody>
              </TableShell>
            </div>
            <div>
              <p className="eyebrow mb-4">Order status</p>
              <TableShell>
                <thead><tr><Th>Status</Th><Th className="text-right">Orders</Th></tr></thead>
                <tbody>
                  {Object.entries(a.statusBreakdown).map(([status, count]) => (
                    <tr key={status}><Td className="capitalize">{status.replace('_', ' ')}</Td><Td className="text-right">{count}</Td></tr>
                  ))}
                </tbody>
              </TableShell>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
