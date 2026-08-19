import * as React from 'react';
import { cn } from '../../lib/utils';

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'text-xs font-semibold text-slate-700 dark:text-slate-200 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center space-x-1',
          className
        )}
        {...props}
      >
        <span>{children}</span>
        {required && <span className="text-rose-500 font-bold">*</span>}
      </label>
    );
  }
);
Label.displayName = 'Label';

export { Label };
