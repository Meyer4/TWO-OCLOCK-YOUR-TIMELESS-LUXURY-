import * as React from 'react';
import { cn } from '@/lib/utils';

const inputClass =
  'w-full border-0 border-b border-ink-line bg-transparent px-0 py-3 text-sm text-ivory placeholder:text-stone focus:border-gold focus:outline-none disabled:opacity-50';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(inputClass, className)} {...props} />
));
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(inputClass, 'min-h-24 resize-y', className)} {...props} />,
);
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(inputClass, 'appearance-none bg-ink pr-6', className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export function Field({
  label,
  error,
  hint,
  children,
  className,
  htmlFor,
}: {
  label: string;
  error?: string | undefined;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn('flex flex-col', className)}>
      <label htmlFor={htmlFor} className="text-[11px] uppercase tracking-[0.2em] text-stone">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-stone">{hint}</p>
      ) : null}
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error' | 'success'; children: React.ReactNode }) {
  const styles = {
    info: 'border-gold/40 text-ivory-dim',
    error: 'border-danger/50 text-danger',
    success: 'border-success/50 text-success',
  };
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('border px-4 py-3 text-sm', styles[tone])}>
      {children}
    </div>
  );
}
