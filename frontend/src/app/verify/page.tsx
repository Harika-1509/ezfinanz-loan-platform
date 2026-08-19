'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useAuth, ApplicationStage } from '../../contexts/auth-context';
import { apiClient, ApiError } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { OtpInput } from '../../components/ui/otp-input';
import { Badge } from '../../components/ui/badge';
import { ProtectedRoute } from '../../components/auth/route-guards';

interface VerificationStatusResponse {
  email: string | null;
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
  isFullyVerified?: boolean;
  canProceedToKyc?: boolean;
  currentApplicationStage?: ApplicationStage;
}

export default function VerificationPage() {
  const { user, updateApplicationStage } = useAuth();
  const router = useRouter();

  // Verification Step: 'email' | 'phone' | 'complete'
  const [activeStep, setActiveStep] = useState<'email' | 'phone' | 'complete'>('email');

  // Status flags
  const [emailVerified, setEmailVerified] = useState<boolean>(false);
  const [phoneVerified, setPhoneVerified] = useState<boolean>(false);
  const [targetEmail, setTargetEmail] = useState<string>('');
  const [targetPhone, setTargetPhone] = useState<string>('');

  // Email OTP Form
  const [emailOtp, setEmailOtp] = useState<string>('');
  const [emailOtpSent, setEmailOtpSent] = useState<boolean>(false);
  const [emailCountdown, setEmailCountdown] = useState<number>(0);

  // Phone OTP Form
  const [phoneOtp, setPhoneOtp] = useState<string>('');
  const [phoneOtpSent, setPhoneOtpSent] = useState<boolean>(false);
  const [phoneCountdown, setPhoneCountdown] = useState<number>(0);

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Countdown timers
  useEffect(() => {
    if (emailCountdown > 0) {
      const timer = setTimeout(() => setEmailCountdown(emailCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [emailCountdown]);

  useEffect(() => {
    if (phoneCountdown > 0) {
      const timer = setTimeout(() => setPhoneCountdown(phoneCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [phoneCountdown]);

  // Fetch initial verification status
  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.get<VerificationStatusResponse>('/verification/status');
      const data = res.data!;

      setEmailVerified(data.emailVerified);
      setPhoneVerified(data.phoneVerified);
      setTargetEmail(data.email || user?.email || '');
      setTargetPhone(data.phone || user?.phone || '');

      const isBoth = data.isFullyVerified ?? (data.emailVerified && data.phoneVerified);
      if (isBoth) {
        setActiveStep('complete');
      } else if (!data.emailVerified) {
        setActiveStep('email');
      } else {
        setActiveStep('phone');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to load verification status.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Send Email OTP
  const handleSendEmailOtp = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await apiClient.post('/verification/email/send', {});
      setEmailOtpSent(true);
      setEmailCountdown(30);
      setSuccessMessage(`Verification OTP sent to ${targetEmail}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to dispatch email OTP.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verify Email OTP
  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (emailOtp.length < 6) {
      setErrorMessage('Please enter the full 6-digit email OTP.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/verification/email/verify', { otp: emailOtp });
      setEmailVerified(true);
      setSuccessMessage('Email verified successfully! Proceeding to phone verification...');

      setTimeout(() => {
        setSuccessMessage(null);
        setActiveStep('phone');
      }, 800);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Invalid or expired OTP. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send Phone OTP
  const handleSendPhoneOtp = async () => {
    if (!targetPhone || !/^[6-9]\d{9}$/.test(targetPhone)) {
      setErrorMessage('Please provide a valid 10-digit Indian phone number.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await apiClient.post('/verification/phone/send', { phone: targetPhone });
      setPhoneOtpSent(true);
      setPhoneCountdown(30);
      setSuccessMessage(`Verification OTP sent to +91 ${targetPhone}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to dispatch mobile phone OTP.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verify Phone OTP
  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (phoneOtp.length < 6) {
      setErrorMessage('Please enter the full 6-digit mobile OTP.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.post<{ applicationStage: ApplicationStage }>(
        '/verification/phone/verify',
        { otp: phoneOtp, phone: targetPhone }
      );

      setPhoneVerified(true);
      setActiveStep('complete');
      updateApplicationStage(res.data?.applicationStage || 'KYC_PENDING');
      setSuccessMessage('Dual verification complete! Your loan application is now ready for KYC.');

      setTimeout(() => {
        router.push('/apply');
      }, 1200);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Invalid or expired OTP. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-900 to-emerald-600 shadow-md">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Two-Factor Identity Verification
            </h1>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              Per RBI digital lending regulations, please verify both your email address and mobile phone number to secure your loan account.
            </p>
          </div>

          {/* Stepper Indicator */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className={`flex items-center space-x-2.5 rounded-xl border p-3 transition-all ${
                emailVerified
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
                  : activeStep === 'email'
                  ? 'border-emerald-600 bg-white ring-2 ring-emerald-500/20 dark:bg-slate-900'
                  : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-950'
              }`}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  emailVerified
                    ? 'bg-emerald-600 text-white'
                    : activeStep === 'email'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-800'
                }`}
              >
                {emailVerified ? <CheckCircle2 className="h-4 w-4" /> : '1'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold leading-tight truncate">
                  Email Verification
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {emailVerified ? 'Verified' : 'OTP Pending'}
                </p>
              </div>
            </div>

            <div
              className={`flex items-center space-x-2.5 rounded-xl border p-3 transition-all ${
                phoneVerified
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
                  : activeStep === 'phone'
                  ? 'border-emerald-600 bg-white ring-2 ring-emerald-500/20 dark:bg-slate-900'
                  : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-950'
              }`}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  phoneVerified
                    ? 'bg-emerald-600 text-white'
                    : activeStep === 'phone'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-800'
                }`}
              >
                {phoneVerified ? <CheckCircle2 className="h-4 w-4" /> : '2'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold leading-tight truncate">
                  Phone Verification
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {phoneVerified ? 'Verified' : 'OTP Pending'}
                </p>
              </div>
            </div>
          </div>

          {/* Verification Body Card */}
          <Card className="border-slate-200/80 shadow-glass backdrop-blur-md">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                  {activeStep === 'email' && 'Step 1: Verify Email Address'}
                  {activeStep === 'phone' && 'Step 2: Verify Mobile Number'}
                  {activeStep === 'complete' && '2FA Verification Complete'}
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  {activeStep === 'email' && 'Email 2FA'}
                  {activeStep === 'phone' && 'Phone 2FA'}
                  {activeStep === 'complete' && 'Ready'}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                {activeStep === 'email' &&
                  `We will send a 6-digit confirmation code to ${targetEmail}`}
                {activeStep === 'phone' &&
                  `We will send a 6-digit SMS code to +91 ${targetPhone}`}
                {activeStep === 'complete' &&
                  'Your security credentials have been verified.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Alert Banners */}
              {errorMessage && (
                <div className="flex items-start space-x-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600 mt-0.5" />
                  <div className="flex-1">{errorMessage}</div>
                </div>
              )}

              {successMessage && (
                <div className="flex items-start space-x-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600 mt-0.5" />
                  <div className="flex-1">{successMessage}</div>
                </div>
              )}

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                  <p className="text-xs text-slate-500">Checking verification status...</p>
                </div>
              ) : activeStep === 'email' ? (
                /* Step 1: Email OTP Form */
                <div className="space-y-4">
                  {!emailOtpSent ? (
                    <div className="space-y-3 text-center py-3">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {targetEmail}
                        </p>
                        <p className="text-xs text-slate-500">
                          Click below to dispatch your email verification OTP.
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={handleSendEmailOtp}
                        disabled={isSubmitting}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 shadow-sm"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Dispatching OTP...
                          </>
                        ) : (
                          'Send Email OTP'
                        )}
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleVerifyEmailOtp} className="space-y-4">
                      <div className="text-center space-y-1">
                        <Label>Enter 6-Digit Email Verification Code</Label>
                        <p className="text-[11px] text-slate-400">
                          (Demo bypass OTP: <span className="font-mono font-bold text-emerald-600">123456</span>)
                        </p>
                      </div>

                      <OtpInput
                        value={emailOtp}
                        onChange={setEmailOtp}
                        disabled={isSubmitting}
                        error={Boolean(errorMessage)}
                      />

                      <Button
                        type="submit"
                        disabled={isSubmitting || emailOtp.length < 6}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verifying Email...
                          </>
                        ) : (
                          <>
                            Verify Email OTP
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>

                      <div className="text-center">
                        <button
                          type="button"
                          disabled={emailCountdown > 0 || isSubmitting}
                          onClick={handleSendEmailOtp}
                          className="text-xs font-semibold text-emerald-600 hover:underline disabled:opacity-50 inline-flex items-center space-x-1"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          <span>
                            {emailCountdown > 0
                              ? `Resend Email OTP in ${emailCountdown}s`
                              : 'Resend Email OTP'}
                          </span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : activeStep === 'phone' ? (
                /* Step 2: Phone OTP Form */
                <div className="space-y-4">
                  {!phoneOtpSent ? (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="phoneInput" required>
                          Confirm Mobile Number
                        </Label>
                        <Input
                          id="phoneInput"
                          type="tel"
                          placeholder="9876543210"
                          maxLength={10}
                          value={targetPhone}
                          onChange={(e) => setTargetPhone(e.target.value)}
                          icon={<Phone className="h-4 w-4" />}
                          disabled={isSubmitting}
                        />
                      </div>

                      <Button
                        type="button"
                        onClick={handleSendPhoneOtp}
                        disabled={isSubmitting || !targetPhone}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 shadow-sm"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending Phone OTP...
                          </>
                        ) : (
                          'Send Phone OTP'
                        )}
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
                      <div className="text-center space-y-1">
                        <Label>Enter 6-Digit SMS Code sent to +91 {targetPhone}</Label>
                        <p className="text-[11px] text-slate-400">
                          (Demo bypass OTP: <span className="font-mono font-bold text-emerald-600">123456</span>)
                        </p>
                      </div>

                      <OtpInput
                        value={phoneOtp}
                        onChange={setPhoneOtp}
                        disabled={isSubmitting}
                        error={Boolean(errorMessage)}
                      />

                      <Button
                        type="submit"
                        disabled={isSubmitting || phoneOtp.length < 6}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verifying Phone...
                          </>
                        ) : (
                          <>
                            Verify Phone OTP & Complete
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>

                      <div className="text-center">
                        <button
                          type="button"
                          disabled={phoneCountdown > 0 || isSubmitting}
                          onClick={handleSendPhoneOtp}
                          className="text-xs font-semibold text-emerald-600 hover:underline disabled:opacity-50 inline-flex items-center space-x-1"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          <span>
                            {phoneCountdown > 0
                              ? `Resend Phone OTP in ${phoneCountdown}s`
                              : 'Resend Phone OTP'}
                          </span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                /* Step 3: Complete State */
                <div className="text-center py-6 space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 shadow-glow">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Verification Complete!
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Both email and phone number are authenticated. Taking you to the loan application...
                  </p>
                  <Button
                    type="button"
                    onClick={() => router.push('/apply')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 h-11"
                  >
                    Proceed to Application
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
