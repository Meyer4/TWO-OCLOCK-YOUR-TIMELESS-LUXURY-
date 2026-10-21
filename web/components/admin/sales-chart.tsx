import { formatMWK } from '@/lib/format';

/** Dependency-free bar chart. Bars are scaled to the period's peak revenue. */
export function SalesChart({ series }: { series: Array<{ label: string; revenue: number; orders: number }> }) {
  if (series.length === 0) return <p className="text-sm text-stone">No sales in this period yet.</p>;
  const peak = Math.max(1, ...series.map((s) => s.revenue));
  return (
    <figure className="border border-ink-line p-6">
      <div className="flex h-56 items-end gap-1" role="img" aria-label={`Revenue by ${series[0]?.label ?? 'period'}`}>
        {series.map((s) => (
          <div key={s.label} className="group relative flex h-full flex-1 items-end" title={`${s.label}: ${formatMWK(s.revenue)} · ${s.orders} orders`}>
            <div className="w-full bg-gold/70 transition-colors group-hover:bg-gold" style={{ height: `${Math.max(2, (s.revenue / peak) * 100)}%` }} />
          </div>
        ))}
      </div>
      <figcaption className="mt-3 flex justify-between text-[10px] uppercase tracking-[0.15em] text-stone">
        <span>{series[0]?.label}</span>
        <span>{series[series.length - 1]?.label}</span>
      </figcaption>
    </figure>
  );
}
