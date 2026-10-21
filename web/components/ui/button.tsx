import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none text-xs font-medium uppercase tracking-[0.18em] transition-colors duration-200 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-offset-2',
  {
    variants: {
      variant: {
        gold: 'bg-gold text-ink hover:bg-gold-bright',
        outline: 'border border-gold/70 text-gold hover:bg-gold hover:text-ink',
        ivory: 'bg-ivory text-ink hover:bg-ivory-dim',
        ghost: 'text-ivory-dim hover:text-gold',
        danger: 'border border-danger/60 text-danger hover:bg-danger/10',
      },
      size: {
        sm: 'h-9 px-4',
        md: 'h-11 px-6',
        lg: 'h-13 px-8 py-4',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'gold', size: 'md' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = 'Button';

export { buttonVariants };
