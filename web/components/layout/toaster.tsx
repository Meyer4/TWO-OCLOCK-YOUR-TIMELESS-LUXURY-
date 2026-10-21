'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useToast } from '@/store/toast';
import { cn } from '@/lib/utils';

export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className={cn(
              'pointer-events-auto flex items-start justify-between gap-3 border bg-ink-soft px-4 py-3 text-sm shadow-2xl',
              t.tone === 'success' && 'border-success/50 text-ivory',
              t.tone === 'error' && 'border-danger/60 text-ivory',
              t.tone === 'info' && 'border-gold/40 text-ivory',
            )}
          >
            <span>{t.message}</span>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="text-stone hover:text-ivory">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
