import React from 'react';
import Link from 'next/link';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showTagline?: boolean;
  clickable?: boolean;
  className?: string;
}

export function BrandLogo({
  size = 'md',
  showTagline = true,
  clickable = true,
  className = '',
}: BrandLogoProps) {
  const iconSizes = {
    sm: 'h-8 w-8 rounded-lg',
    md: 'h-10 w-10 rounded-xl',
    lg: 'h-12 w-12 rounded-2xl',
    hero: 'h-14 w-14 rounded-2xl',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    hero: 'text-3xl',
  };

  const badgeSizes = {
    sm: 'text-[9px] px-1.5 py-0.2',
    md: 'text-[10px] px-2 py-0.5',
    lg: 'text-xs px-2.5 py-0.5',
    hero: 'text-xs px-3 py-1',
  };

  const content = (
    <div className={`flex items-center space-x-3 group select-none ${className}`}>
      {/* Dynamic Fintech Shield / Growth Surge Vector Icon */}
      <div
        className={`relative flex items-center justify-center bg-gradient-to-tr from-slate-950 via-emerald-950 to-emerald-500 shadow-md shadow-emerald-950/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-emerald-500/25 shrink-0 border border-emerald-400/30 ${iconSizes[size]}`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-6/10 w-6/10 text-emerald-400 drop-shadow-sm transition-transform duration-300 group-hover:rotate-6"
        >
          {/* Outer Diamond/Shield Paths */}
          <path
            d="M12 2L20 6.5V12C20 16.5 16.5 20.5 12 22C7.5 20.5 4 16.5 4 12V6.5L12 2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-90"
          />
          {/* Inner Upward Financial Surge Lightning/Arrow */}
          <path
            d="M12 7L15 11H12.5L13.5 16L9 12H11.5L12 7Z"
            fill="currentColor"
            className="text-white"
          />
        </svg>
        {/* Subtle glowing center spot */}
        <div className="absolute inset-0 rounded-xl bg-emerald-400/10 blur-xs pointer-events-none" />
      </div>

      {/* Brand Name Typography */}
      <div>
        <div className="flex items-center space-x-1.5 leading-none">
          <span className={`font-black tracking-tight text-slate-900 dark:text-white ${textSizes[size]}`}>
            EZ<span className="text-emerald-600 dark:text-emerald-400">Finanz</span>
          </span>
          <span
            className={`rounded-full bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/30 font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 ${badgeSizes[size]}`}
          >
            PRO
          </span>
        </div>
        {showTagline && (
          <p className="mt-1 text-[10px] font-semibold tracking-tight text-slate-500 dark:text-slate-400">
            Digital Lending & Underwriting
          </p>
        )}
      </div>
    </div>
  );

  if (clickable) {
    return (
      <Link
        href="/"
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-xl inline-block"
      >
        {content}
      </Link>
    );
  }

  return content;
}
