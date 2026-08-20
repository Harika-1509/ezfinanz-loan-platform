'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../contexts/auth-context';
import { apiClient } from '../../../lib/api-client';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const token = searchParams.get('token');
        if (token) {
          apiClient.setAccessToken(token);
        }

        // Fetch authenticated user profile & active application with real JWT token
        const meRes = await apiClient.get<{ user: any; application: any }>('/auth/me');
        if (meRes.data?.user) {
          const authenticatedUser = meRes.data.user;
          const activeApp = meRes.data.application || null;

          // Store real session & access token
          setSession(authenticatedUser, activeApp, token);

          if (authenticatedUser.role === 'ADMIN') {
            router.push('/admin');
          } else if (!authenticatedUser.phoneVerified) {
            // Treat all customers equally: Direct to 2-step verification to complete mobile OTP
            router.push('/verify');
          } else {
            router.push('/apply');
          }
        } else {
          router.push('/login');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Authentication failed';
        setError(msg);
      }
    };

    handleOAuthCallback();
  }, [searchParams, setSession, router]);

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-xs text-rose-800 max-w-sm">
          <AlertCircle className="mx-auto h-8 w-8 text-rose-600 mb-2" />
          <p className="font-bold">OAuth Sign In Error</p>
          <p className="mt-1 text-slate-600">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-white font-bold"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          Completing secure sign-in...
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
