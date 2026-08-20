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
  Check,
  X,
} from 'lucide-react';
import { signupSchema, extractFieldErrors } from '../../lib/validation';
import { useAuth } from '../../contexts/auth-context';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card';
import { GuestRoute } from '../../components/auth/route-guards';
import { BrandLogo } from '../../components/ui/brand-logo';

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Real-time password criteria evaluation
  const passwordCriteria = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { label: 'One number (0-9)', met: /[0-9]/.test(password) },
    {
      label: 'One special symbol (@, #, $, etc.)',
      met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password),
    },
  ];

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const validation = signupSchema.safeParse({
      email,
      phone,
      password,
      confirmPassword,
    });

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
      await signup({ email, password, phone });
      setSuccessMessage(
        'Account created successfully! Proceeding to 2FA verification...'
      );
      setTimeout(() => {
        router.push('/verify');
      }, 500);
    } catch (err) {
      const { fieldErrors: extractedFieldErrors, generalMessage } = extractFieldErrors(
        err,
        'Failed to create account. Please try again.'
      );
      setErrorMessage(generalMessage);
      if (Object.keys(extractedFieldErrors).length > 0) {
        setFieldErrors(extractedFieldErrors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    const backendUrl = apiClient.getBaseUrl().replace(/\/api\/v1\/?$/, '');
    window.location.href = `${backendUrl}/api/v1/auth/google`;
  };

  return (
    <GuestRoute>
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          {/* Brand Header */}
          <div className="text-center flex flex-col items-center">
            <BrandLogo size="lg" />
            <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Create Your Application
            </h1>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Apply for instant personal loan up to ₹5 Lakhs in minutes.
            </p>
          </div>

          <Card className="border-slate-200/80 shadow-fintech backdrop-blur-xl rounded-3xl dark:border-slate-800/80">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-black tracking-tight">
                Borrower Registration
              </CardTitle>
              <CardDescription className="text-xs font-medium">
                Enter your details to initiate instant loan eligibility assessment.
              </CardDescription>
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

              <form onSubmit={handleSignup} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="email" required className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
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
                  <Label htmlFor="phone" required className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Mobile Phone Number
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

                <div className="space-y-1.5">
                  <Label htmlFor="password" required className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Create Password
                  </Label>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create strong password"
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

                {/* Real-time Password Strength Criteria */}
                {password.length > 0 && (
                  <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Password Requirements:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                      {passwordCriteria.map((crit, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center space-x-1.5 ${
                            crit.met
                              ? 'text-emerald-600 font-bold'
                              : 'text-slate-400 font-medium'
                          }`}
                        >
                          {crit.met ? (
                            <Check className="h-3 w-3 text-emerald-600 stroke-[3]" />
                          ) : (
                            <X className="h-3 w-3 text-slate-300" />
                          )}
                          <span>{crit.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" required className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    error={Boolean(fieldErrors.confirmPassword)}
                    disabled={isLoading}
                  />
                  {fieldErrors.confirmPassword && (
                    <p className="text-xs font-semibold text-rose-600">{fieldErrors.confirmPassword}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 shadow-md shadow-emerald-950/10 rounded-xl mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Register & Verify
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Social Login Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-white px-2.5 text-slate-400 dark:bg-slate-900 font-bold tracking-wider">
                    Or sign up with
                  </span>
                </div>
              </div>

              {/* Google OAuth Button */}
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignup}
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
                Sign up with Google
              </Button>
            </CardContent>

            <CardFooter className="pt-0 border-t border-slate-100 dark:border-slate-800">
              <p className="text-center text-xs text-slate-500 w-full pt-3 font-medium">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-bold text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  Sign in here
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </GuestRoute>
  );
}
