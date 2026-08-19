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
}: SliderProps) {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  return (
    <div className={`relative flex w-full touch-none select-none items-center py-2 ${className}`}>
      <div className="relative h-2.5 w-full grow overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
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
        disabled={disabled}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
      {/* Custom styled Thumb */}
      <div
        className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 rounded-full border-2 border-white bg-emerald-600 shadow-md shadow-emerald-500/30 transition-[left] duration-75 dark:border-slate-900"
        style={{ left: `${percentage}%` }}
      />
    </div>
  );
}
