import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 dark:focus-visible:ring-emerald-400 dark:focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-50 select-none leading-none gap-2 cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-900/10 hover:from-emerald-700 hover:to-teal-700 hover:shadow-emerald-900/20 active:scale-[0.98]',
        destructive:
          'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-rose-900/10 hover:from-rose-700 hover:to-red-700 active:scale-[0.98]',
        outline:
          'border border-slate-200 bg-white text-slate-800 shadow-xs hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/80 active:scale-[0.98]',
        secondary:
          'bg-slate-100 text-slate-900 shadow-xs hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 active:scale-[0.98]',
        ghost:
          'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white active:scale-[0.98]',
        link: 'text-emerald-600 underline-offset-4 hover:underline dark:text-emerald-400 p-0 h-auto font-medium',
        fintech:
          'bg-slate-900 text-white shadow-md hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 active:scale-[0.98]',
      },
      size: {
        default: 'h-11 min-h-[44px] px-5 py-2.5 text-sm font-semibold',
        sm: 'h-9 min-h-[36px] rounded-lg px-3.5 py-1.5 text-xs font-bold',
        lg: 'h-13 min-h-[52px] rounded-xl px-7 py-3.5 text-base font-bold tracking-tight',
        icon: 'h-10 w-10 min-w-[40px] min-h-[40px] p-0 flex items-center justify-center shrink-0 rounded-xl',
        pill: 'h-9 min-h-[36px] rounded-full px-4 py-1.5 text-xs font-bold',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
