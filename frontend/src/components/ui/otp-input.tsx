import * as React from 'react';
import { cn } from '@/lib/utils';

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  error = false,
  className,
}: OtpInputProps) {
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Initialize refs array
  React.useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  const digits = React.useMemo(() => {
    const arr = value.split('');
    while (arr.length < length) {
      arr.push('');
    }
    return arr.slice(0, length);
  }, [value, length]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) {
      // Deletion
      const newDigits = [...digits];
      newDigits[index] = '';
      onChange(newDigits.join(''));
      return;
    }

    // Capture the last typed numeric character
    const lastChar = val.slice(-1);
    if (!/^\d$/.test(lastChar)) {
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = lastChar;
    const combined = newDigits.join('');
    onChange(combined);

    // Auto-advance focus to next input
    if (index < length - 1 && lastChar) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move to previous box if current is empty
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, length);
    if (pastedData) {
      onChange(pastedData);
      const nextFocusIndex = Math.min(pastedData.length, length - 1);
      inputRefs.current[nextFocusIndex]?.focus();
    }
  };

  return (
    <div
      className={cn('flex items-center justify-center gap-2 sm:gap-3', className)}
      onPaste={handlePaste}
    >
      {Array.from({ length }).map((_, index) => {
        const isFilled = Boolean(digits[index]);
        return (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digits[index]}
            disabled={disabled}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            aria-label={`Digit ${index + 1} of ${length}`}
            className={cn(
              'h-13 w-11 sm:h-14 sm:w-12 rounded-xl border text-center text-xl font-bold tracking-tight shadow-xs transition-all duration-150 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
              error
                ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-200'
                : isFilled
                ? 'border-emerald-600 bg-emerald-50/30 text-emerald-950 font-extrabold focus:border-emerald-600 focus:ring-emerald-600/20 dark:border-emerald-500 dark:bg-emerald-950/20 dark:text-emerald-100'
                : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 focus:border-emerald-600 focus:ring-emerald-600/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100'
            )}
          />
        );
      })}
    </div>
  );
}
