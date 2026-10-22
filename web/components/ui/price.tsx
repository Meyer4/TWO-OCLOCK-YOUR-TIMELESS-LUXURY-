import { formatMWK } from '@/lib/format';
import { cn } from '@/lib/utils';

export function Price({ price, salePrice, className }: { price: number; salePrice?: number | null; className?: string }) {
  const onSale = salePrice != null && salePrice > 0 && salePrice < price;
  return (
    <p className={cn('font-display text-lg text-ivory', className)}>
      {onSale ? (
        <>
          <span className="mr-2 text-sm text-stone line-through">{formatMWK(price)}</span>
          <span className="text-gold">{formatMWK(salePrice)}</span>
        </>
      ) : (
        formatMWK(price)
      )}
    </p>
  );
}
