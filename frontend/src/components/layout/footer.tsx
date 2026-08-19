import React from 'react';
import { ShieldCheck, Lock, Landmark, FileCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 py-10 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Security & Compliance Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-8 border-b border-slate-100 dark:border-slate-800 text-center">
          <div className="flex flex-col items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <Lock className="h-5 w-5 text-emerald-600 mb-1.5" />
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              256-Bit SSL Encryption
            </p>
            <p className="text-[11px] text-slate-500">Bank-Grade Security</p>
          </div>

          <div className="flex flex-col items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <ShieldCheck className="h-5 w-5 text-teal-600 mb-1.5" />
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              ISO 27001 Certified
            </p>
            <p className="text-[11px] text-slate-500">Data Privacy Assured</p>
          </div>

          <div className="flex flex-col items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <Landmark className="h-5 w-5 text-blue-600 mb-1.5" />
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Regulated NBFC Network
            </p>
            <p className="text-[11px] text-slate-500">RBI Lending Norms</p>
          </div>

          <div className="flex flex-col items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <FileCheck className="h-5 w-5 text-indigo-600 mb-1.5" />
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Zero Hidden Charges
            </p>
            <p className="text-[11px] text-slate-500">100% Transparent APR</p>
          </div>
        </div>

        {/* Copyright & Disclaimer */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 space-y-3 sm:space-y-0">
          <p>
            © {new Date().getFullYear()} EZFinanz Digital Lending Platform. All
            rights reserved.
          </p>
          <div className="flex space-x-6">
            <span className="hover:text-slate-700 cursor-pointer">
              Privacy Policy
            </span>
            <span className="hover:text-slate-700 cursor-pointer">
              Terms of Service
            </span>
            <span className="hover:text-slate-700 cursor-pointer">
              Fair Practices Code
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
