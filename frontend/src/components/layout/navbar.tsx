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
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-xl">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-slate-900 via-teal-900 to-emerald-600 shadow-md transition-transform group-hover:scale-105">
            <Sparkles className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                EZ<span className="text-emerald-600">Finanz</span>
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                PRO
              </span>
            </div>
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
              Instant Personal Loan Platform
            </p>
          </div>
        </Link>

        {/* Center Nav Links (Desktop) */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium" aria-label="Main Navigation">
          <Link
            href="/"
            className={`transition-colors hover:text-emerald-600 rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
              pathname === '/'
                ? 'text-emerald-600 font-bold'
                : 'text-slate-700 dark:text-slate-200'
            }`}
          >
            Overview
          </Link>
          <Link
            href="/apply"
            className={`transition-colors hover:text-emerald-600 rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
              pathname.startsWith('/apply')
                ? 'text-emerald-600 font-bold'
                : 'text-slate-700 dark:text-slate-200'
            }`}
          >
            Apply Loan
          </Link>
          {isAuthenticated && role === 'CUSTOMER' && (
            <Link
              href="/dashboard"
              className={`flex items-center space-x-1.5 transition-colors hover:text-emerald-600 rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                pathname === '/dashboard'
                  ? 'text-emerald-600 font-bold'
                  : 'text-slate-700 dark:text-slate-200'
              }`}
            >
              <LayoutDashboard className="h-4 w-4 text-emerald-600" />
              <span>Dashboard</span>
            </Link>
          )}
          {role === 'ADMIN' && (
            <Link
              href="/admin"
              className={`flex items-center space-x-1.5 transition-colors hover:text-emerald-600 rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                pathname.startsWith('/admin')
                  ? 'text-emerald-600 font-bold'
                  : 'text-slate-700 dark:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4 text-rose-600" />
              <span>Admin Portal</span>
            </Link>
          )}
        </nav>

        {/* Right Authentication & Role Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Role Indicator Badge */}
              <Badge
                variant={role === 'ADMIN' ? 'destructive' : 'secondary'}
                className="hidden sm:inline-flex items-center space-x-1 font-bold"
              >
                {role === 'ADMIN' ? (
                  <>
                    <Lock className="h-3 w-3 mr-1" />
                    <span>ADMIN</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-3 w-3 mr-1 text-emerald-600" />
                    <span>BORROWER</span>
                  </>
                )}
              </Badge>

              {/* User Email (Desktop) */}
              <div className="hidden xl:block text-right text-xs">
                <p className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                  {user.email || user.phone || 'User'}
                </p>
                <p className="text-slate-500 capitalize text-[10px]">
                  {user.role.toLowerCase()}
                </p>
              </div>

              {role === 'ADMIN' ? (
                <Link href="/admin">
                  <Button size="sm" variant="outline" className="hidden sm:inline-flex text-xs font-bold">
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-rose-600" />
                    Operations
                  </Button>
                </Link>
              ) : (
                <Link href="/apply">
                  <Button
                    size="sm"
                    className="hidden sm:inline-flex bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                  >
                    My Loan
                  </Button>
                </Link>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => logout()}
                className="text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 dark:text-slate-300"
                aria-label="Log out of EZFinanz"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2.5">
              <Link href="/login">
                <Button size="sm" variant="ghost" className="text-xs font-semibold px-3 py-1.5">
                  <User className="h-3.5 w-3.5 mr-1" />
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  size="pill"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs px-4 py-1.5"
                >
                  Apply Now
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
        <div className="md:hidden border-t border-slate-200 bg-white/95 px-4 pt-3 pb-5 space-y-2 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 animate-in fade-in-50 slide-in-from-top-2">
          {isAuthenticated && user && (
            <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user.email || user.phone}
                </p>
                <p className="text-[10px] text-slate-500">
                  Role: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{user.role}</span>
                </p>
              </div>
              <Badge variant={role === 'ADMIN' ? 'destructive' : 'secondary'} className="text-[10px]">
                {user.role}
              </Badge>
            </div>
          )}

          <nav className="flex flex-col space-y-1" aria-label="Mobile Navigation">
            <Link
              href="/"
              onClick={closeMobileMenu}
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
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
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
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
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
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
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
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
                <Button variant="outline" size="sm" className="w-full text-xs font-semibold py-2">
                  <User className="h-3.5 w-3.5 mr-1.5" />
                  Sign In
                </Button>
              </Link>
              <Link href="/signup" onClick={closeMobileMenu} className="w-full">
                <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2">
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
