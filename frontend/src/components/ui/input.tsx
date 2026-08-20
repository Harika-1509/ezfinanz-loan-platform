import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, rightElement, ...props }, ref) => {
    if (icon || rightElement) {
      return (
        <div className="relative flex items-center w-full">
          {icon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              'flex h-11 w-full rounded-xl border bg-white px-3.5 py-2 text-sm font-medium text-slate-900 shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-semibold placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:border-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:ring-emerald-500',
              icon && 'pl-10',
              rightElement && 'pr-10',
              error
                ? 'border-rose-500 focus-visible:ring-rose-500 focus-visible:border-rose-500 dark:border-rose-500'
                : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700',
              className
            )}
            ref={ref}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3.5 flex items-center">
              {rightElement}
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-xl border bg-white px-3.5 py-2 text-sm font-medium text-slate-900 shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-semibold placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:border-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:ring-emerald-500',
          error
            ? 'border-rose-500 focus-visible:ring-rose-500 focus-visible:border-rose-500 dark:border-rose-500'
            : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
