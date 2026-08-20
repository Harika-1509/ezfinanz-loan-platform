import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-emerald-600 text-white shadow-xs',
        secondary:
          'border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200',
        destructive:
          'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300',
        outline: 'border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300',
        success:
          'border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-300',
        warning:
          'border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-300',
        info:
          'border-sky-200 bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:border-sky-800/60 dark:text-sky-300',
        purple:
          'border-purple-200 bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:border-purple-800/60 dark:text-purple-300',
        emerald:
          'border-emerald-500/40 bg-slate-900 text-emerald-400 dark:bg-slate-800 dark:border-emerald-500/50 shadow-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            variant === 'success' || variant === 'default' || variant === 'emerald'
              ? 'bg-emerald-500 animate-pulse'
              : variant === 'destructive'
              ? 'bg-rose-600'
              : variant === 'warning'
              ? 'bg-amber-500 animate-pulse'
              : variant === 'info'
              ? 'bg-sky-500'
              : 'bg-slate-500'
          )}
        />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
