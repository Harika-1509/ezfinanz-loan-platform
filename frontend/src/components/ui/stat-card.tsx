import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from './card';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  badge?: {
    text: string;
    variant?: 'success' | 'warning' | 'destructive' | 'info' | 'secondary';
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-emerald-600 dark:text-emerald-400',
  iconBgColor = 'bg-emerald-100/70 dark:bg-emerald-950/60',
  badge,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {value}
          </p>
        </div>

        {Icon && (
          <div className={cn('flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl shrink-0 shadow-xs', iconBgColor)}>
            <Icon className={cn('h-5 w-5 sm:h-6 sm:w-6', iconColor)} />
          </div>
        )}
      </div>

      {(subtitle || badge) && (
        <div className="mt-4 flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          {badge && (
            <span
              className={cn(
                'rounded-md px-2 py-0.5 text-[11px] font-bold',
                badge.variant === 'success' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                badge.variant === 'warning' && 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
                badge.variant === 'destructive' && 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
                badge.variant === 'info' && 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
                (!badge.variant || badge.variant === 'secondary') && 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              )}
            >
              {badge.text}
            </span>
          )}
          {subtitle && (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
