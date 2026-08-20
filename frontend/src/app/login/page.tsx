'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import {
  Sparkles,
  Mail,
  Lock,
  Phone,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { loginSchema, phoneOtpLoginSchema, verifyOtpSchema, extractFieldErrors } from '../../lib/validation';
import { useAuth } from '../../contexts/auth-context';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card';
import { OtpInput } from '../../components/ui/otp-input';
import { GuestRoute } from '../../components/auth/route-guards';

export default function LoginPage() {
  const { login, setMockSession } = useAuth();
  const router = useRouter();

  // Auth mode: 'password' | 'otp'
  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password');

  // Password Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Phone OTP Login State
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Common UI State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Countdown timer effect
  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Handle Email & Password Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) errors[err.path[0].toString()] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(email, password);
      setSuccessMessage('Login successful! Redirecting to your portal...');
      setTimeout(() => {
        if (result.user.role === 'ADMIN') {
          router.push('/admin');
        } else {
          router.push('/apply');
        }
      }, 500);
    } catch (err) {
      const { fieldErrors: extractedFieldErrors, generalMessage } = extractFieldErrors(
        err,
        'Failed to sign in. Please verify your credentials.'
      );
      setErrorMessage(generalMessage);
      if (Object.keys(extractedFieldErrors).length > 0) {
        setFieldErrors(extractedFieldErrors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Send Phone OTP for login
  const handleSendPhoneOtp = async () => {
    setErrorMessage(null);
    setFieldErrors({});

    const validation = phoneOtpLoginSchema.safeParse({ phone });
    if (!validation.success) {
      setFieldErrors({ phone: validation.error.errors[0].message });
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.post<any>('/auth/otp/send', { phone, purpose: 'LOGIN' });
      setOtpSent(true);
      setCountdown(10);
      const msg = res.message || res.data?.message || '6-digit login OTP sent to your phone.';
      setSuccessMessage(msg);
      if (res.data?.devOtp) {
        setOtp(res.data.devOtp);
      }
    } catch (err) {
      const { fieldErrors: extractedFieldErrors, generalMessage } = extractFieldErrors(
        err,
        'Failed to send OTP. Please try again.'
      );
      setErrorMessage(generalMessage);
      if (Object.keys(extractedFieldErrors).length > 0) {
        setFieldErrors(extractedFieldErrors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Verify Phone OTP for login
  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validation = verifyOtpSchema.safeParse({ otp });
    if (!validation.success) {
      setErrorMessage(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.post('/auth/otp/verify', {
        phone,
        otp,
        purpose: 'LOGIN',
      });

      const { user, application, accessToken } = res.data;
      apiClient.setAccessToken(accessToken);
      setMockSession(user, application);

      setSuccessMessage('OTP verified successfully! Redirecting...');
      setTimeout(() => {
        if (user.role === 'ADMIN') {
          router.push('/admin');
        } else {
          router.push('/apply');
        }
      }, 500);
    } catch (err) {
      const { fieldErrors: extractedFieldErrors, generalMessage } = extractFieldErrors(
        err,
        'Invalid or expired OTP. Please try again.'
      );
      setErrorMessage(generalMessage);
      if (Object.keys(extractedFieldErrors).length > 0) {
        setFieldErrors(extractedFieldErrors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth Login
  const handleGoogleLogin = () => {
    const backendUrl = apiClient.getBaseUrl().replace(/\/api\/v1\/?$/, '');
    window.location.href = `${backendUrl}/api/v1/auth/google`;
  };

  // Quick Demo Autofill helpers
  const fillCustomerDemo = () => {
    setEmail('borrower@example.com');
    setPassword('Password@123');
    setAuthMode('password');
    setFieldErrors({});
  };

  const fillAdminDemo = () => {
    setEmail('admin@ezfinanz.com');
    setPassword('AdminPassword@123');
    setAuthMode('password');
    setFieldErrors({});
  };

  return (
    <GuestRoute>
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          {/* Brand Header */}
          <div className="text-center">
            <Link href="/" className="inline-flex items-center space-x-2 group">
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-tr from-slate-900 via-teal-900 to-emerald-600 shadow-md transition-transform group-hover:scale-105">
                <Sparkles className="h-6 w-6 text-emerald-400" />
              </div>
            </Link>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Sign In to EZ<span className="text-emerald-600">Finanz</span>
            </h1>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Access your loan application or administrative review dashboard.
            </p>
          </div>

          {/* Main Card */}
          <Card className="border-slate-200/80 shadow-fintech backdrop-blur-xl rounded-3xl dark:border-slate-800/80">
            <CardHeader className="pb-4">
              {/* Mode Toggle Tabs */}
              <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={authMode === 'password'}
                  onClick={() => {
                    setAuthMode('password');
                    setErrorMessage(null);
                  }}
                  className={`inline-flex items-center justify-center rounded-xl py-2 px-3 text-xs font-bold transition-all min-h-[40px] leading-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer ${
                    authMode === 'password'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Password Login
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={authMode === 'otp'}
                  onClick={() => {
                    setAuthMode('otp');
                    setErrorMessage(null);
                  }}
                  className={`inline-flex items-center justify-center rounded-xl py-2 px-3 text-xs font-bold transition-all min-h-[40px] leading-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer ${
                    authMode === 'otp'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Phone OTP Login
                </button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Alert Notification Banners */}
              {errorMessage && (
                <div className="flex items-start space-x-2.5 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300 font-medium animate-in fade-in-50">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600 mt-0.5" />
                  <div className="flex-1 font-bold">{errorMessage}</div>
                </div>
              )}

              {successMessage && (
                <div className="flex items-start space-x-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300 font-bold animate-in fade-in-50">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600 mt-0.5" />
                  <div className="flex-1">{successMessage}</div>
                </div>
              )}

              {/* Mode 1: Email + Password Login Form */}
              {authMode === 'password' && (
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" required className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      error={Boolean(fieldErrors.email)}
                      disabled={isLoading}
                    />
                    {fieldErrors.email && (
                      <p className="text-xs font-semibold text-rose-600">{fieldErrors.email}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" required className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Password
                      </Label>
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      error={Boolean(fieldErrors.password)}
                      disabled={isLoading}
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      }
                    />
                    {fieldErrors.password && (
                      <p className="text-xs font-semibold text-rose-600">{fieldErrors.password}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 shadow-md shadow-emerald-950/10 rounded-xl"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Authenticating...
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              )}

              {/* Mode 2: Phone OTP Login Form */}
              {authMode === 'otp' && (
                <div className="space-y-4">
                  {!otpSent ? (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="phone" required className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          10-Digit Mobile Number
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="9876543210"
                          maxLength={10}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          error={Boolean(fieldErrors.phone)}
                          disabled={isLoading}
                        />
                        {fieldErrors.phone && (
                          <p className="text-xs font-semibold text-rose-600">{fieldErrors.phone}</p>
                        )}
                      </div>

                      <Button
                        type="button"
                        onClick={handleSendPhoneOtp}
                        disabled={isLoading}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl shadow-md shadow-emerald-950/10"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending OTP...
                          </>
                        ) : (
                          'Send Login OTP'
                        )}
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
                      <div className="text-center space-y-1">
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Enter 6-Digit Code sent to +91 {phone}</Label>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Enter the SMS verification code dispatched to your mobile.
                        </p>
                      </div>

                      <OtpInput
                        value={otp}
                        onChange={setOtp}
                        disabled={isLoading}
                        error={Boolean(errorMessage)}
                      />

                      <Button
                        type="submit"
                        disabled={isLoading || otp.length < 6}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verifying OTP...
                          </>
                        ) : (
                          'Verify OTP & Sign In'
                        )}
                      </Button>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => {
                            setOtpSent(false);
                            setOtp('');
                            setErrorMessage(null);
                          }}
                          className="font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline cursor-pointer"
                        >
                          ← Change Number
                        </button>

                        <button
                          type="button"
                          disabled={countdown > 0 || isLoading}
                          onClick={handleSendPhoneOtp}
                          className="font-bold text-emerald-600 hover:underline disabled:opacity-50 cursor-pointer"
                        >
                          {countdown > 0
                            ? `Resend OTP in ${countdown}s`
                            : 'Resend Code'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Social Login Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-white px-2.5 text-slate-400 dark:bg-slate-900 font-bold tracking-wider">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Google OAuth Button */}
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleLogin}
                className="w-full border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold h-12 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 rounded-xl"
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Sign in with Google
              </Button>
            </CardContent>

            {/* Quick Demo Autofill helper bar */}
            <CardFooter className="flex flex-col space-y-3 pt-0 border-t border-slate-100 dark:border-slate-800">
              <div className="w-full pt-3.5">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-2 text-center tracking-wider">
                  Quick Fill Test Credentials
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={fillCustomerDemo}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-[11px] font-medium text-slate-700 hover:border-emerald-500 hover:bg-emerald-50/50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 cursor-pointer transition-colors"
                  >
                    👤 <span className="font-bold">Borrower Demo</span>
                  </button>
                  <button
                    type="button"
                    onClick={fillAdminDemo}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-[11px] font-medium text-slate-700 hover:border-rose-500 hover:bg-rose-50/50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 cursor-pointer transition-colors"
                  >
                    🛡️ <span className="font-bold">Admin Demo</span>
                  </button>
                </div>
              </div>

              <p className="text-center text-xs text-slate-500 font-medium">
                Don&apos;t have an account?{' '}
                <Link
                  href="/signup"
                  className="font-bold text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  Create application
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </GuestRoute>
  );
}
