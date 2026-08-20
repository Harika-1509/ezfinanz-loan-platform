import React from 'react';
import { ShieldCheck, Lock, Landmark, FileCheck } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 py-10 mt-auto" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Security & Compliance Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 pb-8 border-b border-slate-200/80 dark:border-slate-800 text-center">
          <div className="flex flex-col items-center p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-xs">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mb-2">
              <Lock className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
              256-Bit SSL Encryption
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Bank-Grade Security</p>
          </div>

          <div className="flex flex-col items-center p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-xs">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 mb-2">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
              ISO 27001 Certified
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Data Privacy Assured</p>
          </div>

          <div className="flex flex-col items-center p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-xs">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 mb-2">
              <Landmark className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Regulated NBFC Network
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">RBI Lending Norms</p>
          </div>

          <div className="flex flex-col items-center p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-xs">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 mb-2">
              <FileCheck className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Zero Hidden Charges
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">100% Transparent APR</p>
          </div>
        </div>

        {/* Copyright & Legal Links */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 dark:text-slate-400 space-y-3 sm:space-y-0">
          <p>
            © {new Date().getFullYear()} EZFinanz Digital Lending Platform. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <Link
              href="/"
              className="hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded px-1"
            >
              Privacy Policy
            </Link>
            <Link
              href="/"
              className="hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded px-1"
            >
              Terms of Service
            </Link>
            <Link
              href="/"
              className="hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded px-1"
            >
              Fair Practices Code
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
