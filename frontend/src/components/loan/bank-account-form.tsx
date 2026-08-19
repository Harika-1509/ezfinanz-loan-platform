'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Landmark,
  ShieldCheck,
  CreditCard,
  Building2,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Lock,
} from 'lucide-react';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAuth } from '../../contexts/auth-context';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';

interface BankAccountFormProps {
  onSuccess?: () => void;
  onBack?: () => void;
}

// IFSC Prefix to Bank Name Mapping for instant user UX
const KNOWN_BANKS: Record<string, string> = {
  HDFC: 'HDFC Bank Ltd',
  SBIN: 'State Bank of India',
  ICIC: 'ICICI Bank Ltd',
  UTIB: 'Axis Bank Ltd',
  KKBK: 'Kotak Mahindra Bank',
  PUNB: 'Punjab National Bank',
  BARB: 'Bank of Baroda',
  INDB: 'IndusInd Bank',
  YESB: 'Yes Bank Ltd',
  CNRB: 'Canara Bank',
  UBIN: 'Union Bank of India',
  IDFB: 'IDFC FIRST Bank',
  FDRL: 'Federal Bank',
  MAHB: 'Bank of Maharashtra',
};

export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const ACCOUNT_REGEX = /^\d{9,18}$/;

export function BankAccountForm({ onSuccess, onBack }: BankAccountFormProps) {
  const { user, application, updateApplicationStage } = useAuth();

  const [holderName, setHolderName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState<string>('');
  const [ifsc, setIfsc] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [detectedBank, setDetectedBank] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Fetch prefill data from KYC / Existing Bank Account
  const loadExistingData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Try to fetch already linked bank account
      const bankRes = await apiClient
        .get<{ bankAccount: any }>('/bank-account/status')
        .catch(() => null);

      if (bankRes?.data?.bankAccount) {
        const b = bankRes.data.bankAccount;
        setHolderName(b.holderName || '');
        setAccountNumber(b.accountNumber || '');
        setConfirmAccountNumber(b.accountNumber || '');
        setIfsc(b.ifsc || '');
        setBankName(b.bankName || '');
        if (b.ifsc && b.ifsc.length >= 4) {
          const prefix = b.ifsc.substring(0, 4).toUpperCase();
          setDetectedBank(KNOWN_BANKS[prefix] || b.bankName);
        }
      } else {
        // 2. Otherwise prefill holder name from KYC
        const kycRes = await apiClient
          .get<{ kyc: any }>('/kyc/status')
          .catch(() => null);
        if (kycRes?.data?.kyc?.fullName) {
          setHolderName(kycRes.data.kyc.fullName);
        }
      }
    } catch (err: any) {
      console.warn('Could not prefill bank account data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExistingData();
  }, [loadExistingData]);

  // Real-time IFSC handler
  const handleIfscChange = (val: string) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
    setIfsc(clean);

    if (clean.length >= 4) {
      const prefix = clean.substring(0, 4);
      if (KNOWN_BANKS[prefix]) {
        setDetectedBank(KNOWN_BANKS[prefix]);
        if (!bankName || Object.values(KNOWN_BANKS).includes(bankName)) {
          setBankName(KNOWN_BANKS[prefix]);
        }
      } else {
        setDetectedBank(null);
      }
    } else {
      setDetectedBank(null);
    }

    if (fieldErrors.ifsc) {
      setFieldErrors((prev) => ({ ...prev, ifsc: '' }));
    }
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!holderName.trim() || holderName.trim().length < 2) {
      errs.holderName = 'Account holder name must be at least 2 characters.';
    }

    if (!accountNumber || !ACCOUNT_REGEX.test(accountNumber)) {
      errs.accountNumber = 'Account number must contain 9 to 18 numeric digits.';
    }

    if (!confirmAccountNumber) {
      errs.confirmAccountNumber = 'Please re-enter your bank account number.';
    } else if (accountNumber !== confirmAccountNumber) {
      errs.confirmAccountNumber = 'Account numbers do not match.';
    }

    if (!ifsc || !IFSC_REGEX.test(ifsc)) {
      errs.ifsc = 'Invalid IFSC code format (e.g. HDFC0001234 or SBIN0004567).';
    }

    if (!bankName.trim() || bankName.trim().length < 2) {
      errs.bankName = 'Bank name is required.';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await apiClient.post<{
        bankAccount: any;
        application: { stage: any };
        message: string;
      }>('/bank-account/submit', {
        holderName: holderName.trim(),
        accountNumber: accountNumber.trim(),
        ifsc: ifsc.trim().toUpperCase(),
        bankName: bankName.trim(),
      });

      if (res.success) {
        setIsSuccess(true);
        updateApplicationStage('BANK_ADDED');
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          }
        }, 1000);
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to link bank account. Please verify details and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-slate-200/80 shadow-glass">
        <CardContent className="flex min-h-[340px] items-center justify-center p-8">
          <div className="text-center space-y-3">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-xs font-semibold text-slate-500">
              Loading bank account details...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      {/* Left Column: Input Form (7 Cols) */}
      <div className="lg:col-span-7 space-y-6">
        <Card className="border-slate-200/80 shadow-glass dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
                <Landmark className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Step 5 of 8: Disbursement Bank
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50">
                Direct NEFT / RTGS
              </Badge>
            </div>

            <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
              Link Your Bank Account
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Please provide the bank account where your loan funds will be directly disbursed.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-center space-x-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {isSuccess && (
                <div className="flex items-center space-x-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Bank account linked successfully! Proceeding to Legal Declaration...</span>
                </div>
              )}

              {/* Account Holder Name */}
              <div className="space-y-1.5">
                <Label htmlFor="holderName" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Account Holder Name (as per Bank Records)
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="holderName"
                    value={holderName}
                    onChange={(e) => {
                      setHolderName(e.target.value);
                      if (fieldErrors.holderName) {
                        setFieldErrors((prev) => ({ ...prev, holderName: '' }));
                      }
                    }}
                    placeholder="Full name as printed on bank passbook / statement"
                    className={`pl-9 text-sm ${fieldErrors.holderName ? 'border-rose-500 ring-1 ring-rose-500' : ''}`}
                    disabled={isSubmitting || isSuccess}
                  />
                </div>
                {fieldErrors.holderName && (
                  <p className="text-[11px] font-medium text-rose-500">{fieldErrors.holderName}</p>
                )}
              </div>

              {/* Account Number */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="accountNumber" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Bank Account Number
                  </Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="accountNumber"
                      type="password"
                      value={accountNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 18);
                        setAccountNumber(val);
                        if (fieldErrors.accountNumber) {
                          setFieldErrors((prev) => ({ ...prev, accountNumber: '' }));
                        }
                      }}
                      placeholder="9 to 18 digits"
                      className={`pl-9 text-sm ${fieldErrors.accountNumber ? 'border-rose-500 ring-1 ring-rose-500' : ''}`}
                      disabled={isSubmitting || isSuccess}
                    />
                  </div>
                  {fieldErrors.accountNumber && (
                    <p className="text-[11px] font-medium text-rose-500">{fieldErrors.accountNumber}</p>
                  )}
                </div>

                {/* Confirm Account Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirmAccountNumber" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Re-enter Account Number
                  </Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="confirmAccountNumber"
                      value={confirmAccountNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 18);
                        setConfirmAccountNumber(val);
                        if (fieldErrors.confirmAccountNumber) {
                          setFieldErrors((prev) => ({ ...prev, confirmAccountNumber: '' }));
                        }
                      }}
                      placeholder="Confirm account number"
                      className={`pl-9 text-sm ${fieldErrors.confirmAccountNumber ? 'border-rose-500 ring-1 ring-rose-500' : ''}`}
                      disabled={isSubmitting || isSuccess}
                    />
                  </div>
                  {fieldErrors.confirmAccountNumber && (
                    <p className="text-[11px] font-medium text-rose-500">{fieldErrors.confirmAccountNumber}</p>
                  )}
                </div>
              </div>

              {/* IFSC & Bank Name */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="ifsc" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Bank IFSC Code
                    </Label>
                    {detectedBank && (
                      <span className="text-[10px] font-bold text-emerald-600">
                        ✓ {detectedBank.slice(0, 15)}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="ifsc"
                      value={ifsc}
                      onChange={(e) => handleIfscChange(e.target.value)}
                      placeholder="e.g. HDFC0001234"
                      maxLength={11}
                      className={`pl-9 font-mono uppercase text-sm ${fieldErrors.ifsc ? 'border-rose-500 ring-1 ring-rose-500' : ''}`}
                      disabled={isSubmitting || isSuccess}
                    />
                  </div>
                  {fieldErrors.ifsc && (
                    <p className="text-[11px] font-medium text-rose-500">{fieldErrors.ifsc}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bankName" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Bank / Branch Name
                  </Label>
                  <Input
                    id="bankName"
                    value={bankName}
                    onChange={(e) => {
                      setBankName(e.target.value);
                      if (fieldErrors.bankName) {
                        setFieldErrors((prev) => ({ ...prev, bankName: '' }));
                      }
                    }}
                    placeholder="e.g. HDFC Bank Ltd - MG Road Branch"
                    className={`text-sm ${fieldErrors.bankName ? 'border-rose-500 ring-1 ring-rose-500' : ''}`}
                    disabled={isSubmitting || isSuccess}
                  />
                  {fieldErrors.bankName && (
                    <p className="text-[11px] font-medium text-rose-500">{fieldErrors.bankName}</p>
                  )}
                </div>
              </div>

              {/* Security Assurance Note */}
              <div className="flex items-start space-x-2 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 dark:bg-slate-900/50">
                <Lock className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Your bank details are encrypted using 256-bit SSL protocols. Funds will only be disbursed after legal declaration confirmation and admin verification.
                </span>
              </div>
            </CardContent>

            <CardFooter className="flex items-center justify-between border-t border-slate-100 p-6 dark:border-slate-800">
              {onBack ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onBack}
                  disabled={isSubmitting || isSuccess}
                  className="text-xs"
                >
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  Back
                </Button>
              ) : (
                <div />
              )}

              <Button
                type="submit"
                disabled={isSubmitting || isSuccess}
                className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-md shadow-emerald-500/20 active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating & Linking...
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Linked Successfully
                  </>
                ) : (
                  <>
                    Save & Continue to Declaration
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      {/* Right Column: Interactive Digital Cheque & Preview Card (5 Cols) */}
      <div className="lg:col-span-5 space-y-6">
        <div className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-6 text-white shadow-xl">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-500/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-teal-500/10 blur-2xl" />

          <div className="flex items-center justify-between pb-6 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Landmark className="h-5 w-5 text-emerald-400" />
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-300">
                EZFINANZ DISBURSEMENT CARD
              </span>
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          </div>

          <div className="py-6 space-y-4">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400">
                Designated Bank
              </span>
              <div className="text-base font-extrabold text-white">
                {bankName || detectedBank || 'Your Bank Institution'}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400">
                Account Number
              </span>
              <div className="font-mono text-lg font-bold tracking-widest text-emerald-400">
                {accountNumber
                  ? `•••• •••• •••• ${accountNumber.slice(-4)}`
                  : '•••• •••• •••• ••••'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400">
                  IFSC Code
                </span>
                <div className="font-mono font-bold text-slate-200">
                  {ifsc || 'XXXX0000000'}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400">
                  Beneficiary
                </span>
                <div className="font-bold text-slate-200 truncate">
                  {holderName || user?.email?.split('@')[0] || 'Valued Customer'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2 rounded-xl bg-slate-800/60 p-3 text-[11px] text-slate-400 border border-slate-800">
            <div className="flex items-center justify-between">
              <span>Disbursement Currency</span>
              <span className="font-bold text-white">INR (₹ Indian Rupee)</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span>Transfer Mode</span>
              <span className="font-bold text-emerald-400">Instant Automated NEFT</span>
            </div>
          </div>
        </div>

        {/* Verification Checkpoint List */}
        <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-xs dark:border-slate-800 dark:bg-slate-900/50">
          <span className="font-bold text-slate-800 dark:text-slate-200">
            Bank Verification Checklist:
          </span>
          <ul className="mt-2 space-y-1.5 text-slate-600 dark:text-slate-400">
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Must be a savings or current account in the applicant&apos;s name.</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Account must be active and enabled for electronic fund transfer.</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>NRE/NRO accounts are not permitted under standard retail loan terms.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
