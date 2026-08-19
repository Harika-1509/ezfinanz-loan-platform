'use client';

import React, { useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (otp: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  error = false,
  autoFocus = true,
  className,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Autofocus first input on mount
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const digits = value.padEnd(length, ' ').slice(0, length).split('');

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const char = e.target.value.slice(-1);
    if (!/^\d*$/.test(char)) return;

    const newDigits = [...digits];
    newDigits[index] = char;
    const newOtp = newDigits.join('').trimEnd();
    onChange(newOtp);

    // Auto-advance to next input if digit entered
    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] || digits[index] === ' ') {
        if (index > 0) {
          inputRefs.current[index - 1]?.focus();
        }
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        onChange(newDigits.join('').trimEnd());
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (!/^\d+$/.test(pastedData)) return;

    const pastedDigits = pastedData.slice(0, length);
    onChange(pastedDigits);

    // Focus on the input after the last pasted digit
    const nextIndex = Math.min(pastedDigits.length, length - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  return (
    <div className={cn('flex items-center justify-center gap-2 sm:gap-3', className)}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          disabled={disabled}
          value={digits[index] === ' ' ? '' : digits[index] || ''}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className={cn(
            'h-12 w-10 sm:h-14 sm:w-12 rounded-xl border-2 text-center text-xl font-bold transition-all shadow-sm focus:outline-none',
            error
              ? 'border-rose-500 bg-rose-50/50 text-rose-900 focus:ring-2 focus:ring-rose-400 dark:bg-rose-950/30 dark:text-rose-200'
              : 'border-slate-200 bg-white text-slate-900 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white',
            disabled && 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800'
          )}
        />
      ))}
    </div>
  );
}
