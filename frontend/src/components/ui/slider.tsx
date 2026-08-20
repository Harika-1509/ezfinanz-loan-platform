'use client';

import * as React from 'react';

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

export function Slider({
  value,
  min,
  max,
  step = 1000,
  onChange,
  disabled = false,
  className = '',
  id,
  'aria-label': ariaLabel = 'Loan amount range slider',
}: SliderProps) {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const [isFocused, setIsFocused] = React.useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  return (
    <div className={`relative flex w-full touch-none select-none items-center py-3 ${className}`}>
      <div className="relative h-3 w-full grow overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="absolute h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed z-10"
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`₹${value.toLocaleString('en-IN')}`}
      />
      {/* Custom styled Thumb with visible focus ring */}
      <div
        className={`pointer-events-none absolute h-6 w-6 -translate-x-1/2 rounded-full border-2 border-white bg-emerald-600 shadow-md shadow-emerald-500/30 transition-[left] duration-75 dark:border-slate-900 ${
          isFocused ? 'ring-4 ring-emerald-500/40 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 scale-110' : ''
        }`}
        style={{ left: `${percentage}%` }}
      />
    </div>
  );
}
