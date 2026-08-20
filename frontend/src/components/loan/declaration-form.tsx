'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileCheck,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ScrollText,
  Landmark,
  Percent,
  CheckSquare,
  Square,
  Lock,
  Download,
} from 'lucide-react';
import { declarationSchema, extractFieldErrors } from '../../lib/validation';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../../contexts/auth-context';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';

interface DeclarationFormProps {
  onSuccess?: () => void;
  onBack?: () => void;
}

interface DeclarationData {
  termsVersion: string;
  applicantName: string;
  loanSummary: {
    sanctionedAmount: number;
    tenureMonths: number;
    interestRate: number;
    emi: number;
    processingFee: number;
    gst: number;
    totalCharges: number;
    netDisbursement: number;
    irr: number;
  } | null;
  disbursementBank: {
    bankName: string;
    accountNumberMasked: string;
    ifsc: string;
    holderName: string;
  } | null;
  clauses: string[];
  fullLegalText: string;
}

export function DeclarationForm({ onSuccess, onBack }: DeclarationFormProps) {
  const { user, application, updateApplicationStage } = useAuth();

  const [declaration, setDeclaration] = useState<DeclarationData | null>(null);
  const [hasAgreed, setHasAgreed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const fetchDeclaration = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<DeclarationData>('/declaration/text');
      if (res.data) {
        setDeclaration(res.data);
      }
    } catch (err: any) {
      const { generalMessage } = extractFieldErrors(
        err,
        'Failed to load loan declaration clauses. Please try again.'
      );
      setError(generalMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeclaration();
  }, [fetchDeclaration]);

  const handleAccept = async () => {
    const validation = declarationSchema.safeParse({
      accepted: hasAgreed,
      termsVersion: declaration?.termsVersion || 'v1.0',
    });

    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await apiClient.post<{
        declaration: any;
        application: { stage: any };
        message: string;
      }>('/declaration/accept', {
        accepted: true,
        termsVersion: declaration?.termsVersion || 'v1.0',
      });

      if (res.success) {
        setIsSuccess(true);
        updateApplicationStage('DECLARATION_CONFIRMED');
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          }
        }, 1000);
      }
    } catch (err: any) {
      const { generalMessage } = extractFieldErrors(
        err,
        'Failed to confirm loan declaration. Please try again.'
      );
      setError(generalMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (isLoading) {
    return (
      <Card className="border-slate-200/80 shadow-fintech">
        <CardContent className="flex min-h-[360px] items-center justify-center p-8">
          <div className="text-center space-y-3">
            <Loader2 className="mx-auto h-9 w-9 animate-spin text-emerald-600" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Generating legal loan declaration & undertaking...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-200/80 shadow-fintech backdrop-blur-xl dark:border-slate-800/80">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center space-x-3 text-emerald-600 dark:text-emerald-400">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 shadow-xs">
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Step 6 of 8: Borrower Undertaking & Legal Consent
                </span>
                <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Loan Agreement & Sanction Declaration
                </CardTitle>
              </div>
            </div>
            <Badge variant="outline" className="self-start sm:self-auto text-xs font-mono font-bold px-3 py-1">
              Terms Version {declaration?.termsVersion || 'v1.0'}
            </Badge>
          </div>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400 font-medium pt-1">
            Please review your final loan terms, disbursement account, and statutory borrower undertakings.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div role="alert" className="flex items-start space-x-2.5 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200 font-medium animate-in fade-in-50">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span className="font-bold">{error}</span>
            </div>
          )}

          {isSuccess && (
            <div role="status" className="flex items-start space-x-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200 font-bold animate-in fade-in-50">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>Declaration accepted! Proceeding to Biometric Selfie Verification...</span>
            </div>
          )}

          {/* Key Loan & Bank Summary Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
            {/* 1. Sanctioned Amount */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-xs dark:border-slate-800 dark:bg-slate-900/80">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Sanctioned Principal
                </span>
                <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                  {formatCurrency(declaration?.loanSummary?.sanctionedAmount)}
                </div>
              </div>
              <div className="mt-2 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                {declaration?.loanSummary?.tenureMonths} Monthly Instalments
              </div>
            </div>

            {/* 2. Monthly EMI */}
            <div className="flex flex-col justify-between rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4.5 shadow-xs dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Monthly EMI
                </span>
                <div className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-300 tabular-nums tracking-tight">
                  {formatCurrency(declaration?.loanSummary?.emi)}
                </div>
              </div>
              <div className="mt-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                @ {declaration?.loanSummary?.interestRate}% p.a. (IRR: {declaration?.loanSummary?.irr}%)
              </div>
            </div>

            {/* 3. Net Disbursement */}
            <div className="flex flex-col justify-between rounded-2xl border border-teal-200 bg-teal-50/50 p-4.5 shadow-xs dark:border-teal-900/40 dark:bg-teal-950/20">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                  Net Disbursement
                </span>
                <div className="mt-1 text-2xl font-black text-teal-700 dark:text-teal-300 tabular-nums tracking-tight">
                  {formatCurrency(declaration?.loanSummary?.netDisbursement)}
                </div>
              </div>
              <div className="mt-2 text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                After ₹{declaration?.loanSummary?.totalCharges.toLocaleString('en-IN')} deductions
              </div>
            </div>

            {/* 4. Disbursement Bank */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-xs dark:border-slate-800 dark:bg-slate-900/80">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Target Account
                  </span>
                  <Landmark className="h-4 w-4 text-slate-400" />
                </div>
                <div className="mt-1 text-base font-black text-slate-900 dark:text-white truncate">
                  {declaration?.disbursementBank?.bankName || 'Linked Bank Account'}
                </div>
              </div>
              <div className="mt-2 font-mono text-[11px] font-bold text-slate-600 dark:text-slate-400">
                {declaration?.disbursementBank?.accountNumberMasked || 'XXXX-XXXX-0000'}
              </div>
            </div>
          </div>

          {/* Scrollable Legal Clauses Box */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <div className="flex items-center space-x-2">
                <ScrollText className="h-4 w-4 text-emerald-600" />
                <span>Statutory Declarations & Consent Clauses (IT Act, 2000)</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Scroll to read all 6 clauses
              </span>
            </div>

            <div
              role="region"
              aria-label="Statutory Declarations and Consent Clauses"
              tabIndex={0}
              className="max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs leading-relaxed text-slate-700 shadow-inner dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 space-y-3 scrollbar-thin focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              {declaration?.clauses.map((clause, idx) => (
                <div key={idx} className="flex items-start space-x-3 rounded-xl bg-white p-3.5 shadow-xs dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {idx + 1}
                  </span>
                  <p className="text-xs leading-relaxed text-slate-800 dark:text-slate-200 font-medium">
                    {clause.replace(/^\d+\.\s*/, '')}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Mandatory Agreement Checkbox */}
          <div
            role="checkbox"
            aria-checked={hasAgreed}
            tabIndex={0}
            onClick={() => setHasAgreed(!hasAgreed)}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                setHasAgreed(!hasAgreed);
              }
            }}
            className={`flex cursor-pointer items-start space-x-3.5 rounded-2xl border p-4.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
              hasAgreed
                ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/20 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-200'
                : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900'
            }`}
          >
            <div className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400">
              {hasAgreed ? (
                <CheckSquare className="h-5 w-5 text-emerald-600" />
              ) : (
                <Square className="h-5 w-5 text-slate-400" />
              )}
            </div>
            <div className="space-y-1 text-xs">
              <span className="font-extrabold text-slate-900 dark:text-white">
                I accept and agree to all terms of the loan sanction and borrower declaration.
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                By clicking &quot;Accept &amp; Confirm Declaration&quot;, I acknowledge that this constitutes a legally binding electronic signature under the Information Technology Act, 2000, and authorize EZFinanz to verify my submission.
              </p>
            </div>
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
              className="text-xs font-semibold rounded-xl"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back
            </Button>
          ) : (
            <div />
          )}

          <Button
            type="button"
            onClick={handleAccept}
            disabled={!hasAgreed || isSubmitting || isSuccess}
            className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-md shadow-emerald-950/10 active:scale-[0.98] disabled:opacity-50 rounded-xl h-12"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording E-Consent...
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Declaration Confirmed
              </>
            ) : (
              <>
                Accept & Confirm Declaration
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
