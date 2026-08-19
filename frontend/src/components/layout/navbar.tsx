'use client';

import React from 'react';
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
} from 'lucide-react';
import { useAuth } from '../../contexts/auth-context';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export function Navbar() {
  const { user, role, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-slate-900 via-teal-900 to-emerald-600 shadow-md transition-transform group-hover:scale-105">
            <Sparkles className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                EZ<span className="text-emerald-600">Finanz</span>
              </span>
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                PRO
              </span>
            </div>
            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
              Instant Personal Loan Platform
            </p>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <Link
            href="/"
            className={`transition-colors hover:text-emerald-600 ${
              pathname === '/'
                ? 'text-emerald-600 font-semibold'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Overview
          </Link>
          <Link
            href="/apply"
            className={`transition-colors hover:text-emerald-600 ${
              pathname.startsWith('/apply')
                ? 'text-emerald-600 font-semibold'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Apply Loan
          </Link>
          {role === 'ADMIN' && (
            <Link
              href="/admin"
              className={`flex items-center space-x-1.5 transition-colors hover:text-emerald-600 ${
                pathname.startsWith('/admin')
                  ? 'text-emerald-600 font-semibold'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Admin Portal</span>
            </Link>
          )}
        </nav>

        {/* Right Authentication & Role Actions */}
        <div className="flex items-center space-x-3">
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-3">
              {/* Role Indicator Badge */}
              <Badge
                variant={role === 'ADMIN' ? 'destructive' : 'secondary'}
                className="hidden sm:inline-flex items-center space-x-1"
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

              {/* User Email & Direct Action */}
              <div className="hidden lg:block text-right text-xs">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {user.email || user.phone || 'User'}
                </p>
                <p className="text-slate-400 capitalize">
                  {user.role.toLowerCase()}
                </p>
              </div>

              {role === 'ADMIN' ? (
                <Link href="/admin">
                  <Button size="sm" variant="outline" className="text-xs">
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <Link href="/apply">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
                  >
                    My Application
                  </Button>
                </Link>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => logout()}
                className="text-slate-500 hover:text-rose-600"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link href="/login">
                <Button size="sm" variant="ghost" className="text-xs">
                  <User className="h-3.5 w-3.5 mr-1.5" />
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-glow"
                >
                  Apply Now
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
