'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, Role } from '../../contexts/auth-context';
import { ShieldCheck, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo,
}: ProtectedRouteProps) {
  const { user, role, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        const loginUrl = redirectTo || `/login?returnUrl=${encodeURIComponent(pathname)}`;
        router.push(loginUrl);
      } else if (allowedRoles && role && !allowedRoles.includes(role)) {
        // Redirect to role home
        if (role === 'ADMIN') {
          router.push('/admin');
        } else {
          router.push('/apply');
        }
      }
    }
  }, [isLoading, isAuthenticated, role, allowedRoles, router, pathname, redirectTo]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
          <ShieldCheck className="absolute h-6 w-6 text-emerald-600 animate-pulse" />
        </div>
        <p className="text-sm font-medium text-slate-500 animate-pulse">
          Verifying security credentials...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || (allowedRoles && role && !allowedRoles.includes(role))) {
    return null;
  }

  return <>{children}</>;
}

export function CustomerRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={['CUSTOMER']}>{children}</ProtectedRoute>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={['ADMIN']}>{children}</ProtectedRoute>;
}

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated && role) {
      if (role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/apply');
      }
    }
  }, [isLoading, isAuthenticated, role, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
