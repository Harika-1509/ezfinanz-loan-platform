import React from 'react';
import { ShieldCheck, Lock, Landmark, FileCheck2, Sparkles } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-950 py-12 mt-auto" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Security & Compliance Badges */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pb-10 border-b border-slate-100 dark:border-slate-800/80 text-left">
          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 shadow-xs transition-all hover:bg-slate-50">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100/80 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                256-Bit SSL Encryption
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Bank-Grade Data Security</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 shadow-xs transition-all hover:bg-slate-50">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100/80 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                ISO 27001 Certified
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Data Privacy Assured</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 shadow-xs transition-all hover:bg-slate-50">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100/80 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Regulated NBFC Network
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">RBI Digital Lending Norms</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 shadow-xs transition-all hover:bg-slate-50">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100/80 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Zero Hidden Charges
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">100% Transparent APR</p>
            </div>
          </div>
        </div>

        {/* Brand & Regulatory Notice */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              EZFinanz Pro Digital Lending Platform
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 font-medium">
            <Link
              href="/"
              className="hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded px-1 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/"
              className="hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded px-1 transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/"
              className="hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded px-1 transition-colors"
            >
              Fair Practices Code
            </Link>
            <Link
              href="/"
              className="hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded px-1 transition-colors"
            >
              Security Policy
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center text-[11px] text-slate-400 dark:text-slate-500">
          © {new Date().getFullYear()} EZFinanz Financial Technologies Private Limited. All rights reserved. Registered NBFC Partner Lending Network.
        </div>
      </div>
    </footer>
  );
}
