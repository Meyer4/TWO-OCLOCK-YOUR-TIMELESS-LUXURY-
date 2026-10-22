import { cn } from '@/lib/utils';

export function Badge({ children, className, tone = 'gold' }: { children: React.ReactNode; className?: string; tone?: 'gold' | 'muted' | 'danger' | 'success' }) {
  const tones = {
    gold: 'border-gold/60 text-gold',
    muted: 'border-ink-line text-stone',
    danger: 'border-danger/60 text-danger',
    success: 'border-success/60 text-success',
  };
  return (
    <span className={cn('inline-flex items-center border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]', tones[tone], className)}>
      {children}
    </span>
  );
}
