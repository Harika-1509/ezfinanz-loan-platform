'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldCheck,
  User,
  LogOut,
  Sparkles,
  LayoutDashboard,
  FileSpreadsheet,
  Lock,
  Menu,
  X,
  ArrowRight,
  ChevronRight,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../../contexts/auth-context';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export function Navbar() {
  const { user, role, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/90 shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center space-x-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-xl"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-slate-900 via-emerald-950 to-emerald-600 shadow-md shadow-emerald-950/20 transition-all duration-200 group-hover:scale-105 group-hover:shadow-emerald-600/20">
            <Sparkles className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                EZ<span className="text-emerald-600">Finanz</span>
              </span>
              <span className="rounded-full bg-emerald-100/80 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                PRO
              </span>
            </div>
            <p className="text-[10px] font-semibold tracking-tight text-slate-400 dark:text-slate-500">
              Digital Lending & Underwriting
            </p>
          </div>
        </Link>

        {/* Center Nav Links (Desktop) */}
        <nav className="hidden md:flex items-center space-x-1 text-sm font-semibold" aria-label="Main Navigation">
          <Link
            href="/"
            className={`transition-all rounded-xl px-3.5 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
              pathname === '/'
                ? 'text-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/50 dark:text-emerald-400 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60'
            }`}
          >
            Overview
          </Link>
          <Link
            href="/apply"
            className={`transition-all rounded-xl px-3.5 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
              pathname.startsWith('/apply')
                ? 'text-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/50 dark:text-emerald-400 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60'
            }`}
          >
            Apply Loan
          </Link>
          {isAuthenticated && role === 'CUSTOMER' && (
            <Link
              href="/dashboard"
              className={`flex items-center space-x-2 transition-all rounded-xl px-3.5 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                pathname === '/dashboard'
                  ? 'text-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/50 dark:text-emerald-400 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="h-4 w-4 text-emerald-600" />
              <span>Borrower Hub</span>
            </Link>
          )}
          {role === 'ADMIN' && (
            <Link
              href="/admin"
              className={`flex items-center space-x-2 transition-all rounded-xl px-3.5 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                pathname.startsWith('/admin')
                  ? 'text-rose-600 bg-rose-50/80 dark:bg-rose-950/50 dark:text-rose-400 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4 text-rose-600" />
              <span>Admin Console</span>
            </Link>
          )}
        </nav>

        {/* Right Authentication & Role Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Role Indicator Badge */}
              <Badge
                variant={role === 'ADMIN' ? 'destructive' : 'success'}
                dot
                className="hidden sm:inline-flex items-center font-bold px-3 py-1"
              >
                {role === 'ADMIN' ? 'ADMIN CONSOLE' : 'BORROWER'}
              </Badge>

              {/* User Email (Desktop) */}
              <div className="hidden lg:block text-right text-xs">
                <p className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                  {user.email || user.phone || 'User'}
                </p>
                <p className="text-slate-400 text-[10px] uppercase font-semibold tracking-wider">
                  {user.role}
                </p>
              </div>

              {role === 'ADMIN' ? (
                <Link href="/admin" className="inline-flex">
                  <Button size="sm" variant="outline" className="hidden sm:inline-flex items-center justify-center gap-1.5 text-xs font-bold shadow-xs px-3.5 py-2 rounded-xl">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                    <span>Operations</span>
                  </Button>
                </Link>
              ) : (
                <Link href="/apply" className="inline-flex">
                  <Button
                    size="sm"
                    className="hidden sm:inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs px-3.5 py-2 rounded-xl"
                  >
                    <CreditCard className="h-3.5 w-3.5 shrink-0" />
                    <span>My Application</span>
                  </Button>
                </Link>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => logout()}
                className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 dark:text-slate-400 rounded-xl"
                aria-label="Log out of EZFinanz"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Link href="/login" className="inline-flex">
                <Button size="sm" variant="ghost" className="text-xs font-bold px-3.5 py-2 text-slate-700 dark:text-slate-200 rounded-xl">
                  <User className="h-3.5 w-3.5 shrink-0" />
                  <span>Sign In</span>
                </Button>
              </Link>
              <Link href="/signup" className="inline-flex">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs px-4 py-2 rounded-xl inline-flex items-center justify-center gap-1.5 shrink-0"
                >
                  <span>Get Started</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white/95 px-4 pt-3 pb-5 space-y-2 backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-950/95 animate-in fade-in-50 slide-in-from-top-2 shadow-lg">
          {isAuthenticated && user && (
            <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-50 p-3.5 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user.email || user.phone}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  Signed in as <span className="font-bold text-emerald-600 dark:text-emerald-400">{user.role}</span>
                </p>
              </div>
              <Badge variant={role === 'ADMIN' ? 'destructive' : 'success'} dot className="text-[10px]">
                {user.role}
              </Badge>
            </div>
          )}

          <nav className="flex flex-col space-y-1" aria-label="Mobile Navigation">
            <Link
              href="/"
              onClick={closeMobileMenu}
              className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                pathname === '/'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <span>Overview</span>
              <ArrowRight className="h-4 w-4 opacity-50" />
            </Link>
            <Link
              href="/apply"
              onClick={closeMobileMenu}
              className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                pathname.startsWith('/apply')
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <span>Apply Loan</span>
              <ArrowRight className="h-4 w-4 opacity-50" />
            </Link>
            {isAuthenticated && role === 'CUSTOMER' && (
              <Link
                href="/dashboard"
                onClick={closeMobileMenu}
                className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                  pathname === '/dashboard'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <LayoutDashboard className="h-4 w-4 text-emerald-600" />
                  <span>Borrower Dashboard</span>
                </div>
                <ArrowRight className="h-4 w-4 opacity-50" />
              </Link>
            )}
            {role === 'ADMIN' && (
              <Link
                href="/admin"
                onClick={closeMobileMenu}
                className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                  pathname.startsWith('/admin')
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet className="h-4 w-4 text-rose-600" />
                  <span>Admin Underwriting Portal</span>
                </div>
                <ArrowRight className="h-4 w-4 opacity-50" />
              </Link>
            )}
          </nav>

          {!isAuthenticated && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2">
              <Link href="/login" onClick={closeMobileMenu} className="w-full">
                <Button variant="outline" size="sm" className="w-full text-xs font-semibold py-2.5">
                  <User className="h-3.5 w-3.5" />
                  Sign In
                </Button>
              </Link>
              <Link href="/signup" onClick={closeMobileMenu} className="w-full">
                <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5">
                  Apply Now
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
