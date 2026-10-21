import { Star } from 'lucide-react';

export function Stars({ value, label }: { value: number; label?: string }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Rated ${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`h-3.5 w-3.5 ${n <= rounded ? 'fill-gold text-gold' : 'text-ink-line'}`} aria-hidden />
      ))}
      {label ? <span className="ml-1 text-xs text-stone">{label}</span> : null}
    </span>
  );
}
