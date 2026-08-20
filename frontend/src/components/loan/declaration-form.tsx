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
      <Card className="border-slate-200/80 shadow-glass">
        <CardContent className="flex min-h-[360px] items-center justify-center p-8">
          <div className="text-center space-y-3">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Generating legal loan declaration & undertaking...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-200/80 shadow-glass dark:border-slate-800">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
              <FileCheck className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Step 6 of 8: Borrower Undertaking & Legal Consent
              </span>
            </div>
            <Badge variant="outline" className="self-start sm:self-auto text-[10px] font-mono font-bold">
              Terms Version {declaration?.termsVersion || 'v1.0'}
            </Badge>
          </div>

          <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
            Loan Agreement & Sanction Declaration
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
            Please review your final loan terms, disbursement account, and statutory borrower undertakings.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div role="alert" className="flex items-center space-x-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {isSuccess && (
            <div role="status" className="flex items-center space-x-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200 font-bold">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Declaration accepted! Proceeding to Biometric Selfie Verification...</span>
            </div>
          )}

          {/* Key Loan & Bank Summary Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Sanctioned Amount */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Sanctioned Principal
              </span>
              <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                {formatCurrency(declaration?.loanSummary?.sanctionedAmount)}
              </div>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                {declaration?.loanSummary?.tenureMonths} Monthly Instalments
              </span>
            </div>

            {/* Monthly EMI */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Monthly EMI
              </span>
              <div className="mt-1 text-lg font-black text-emerald-800 dark:text-emerald-300">
                {formatCurrency(declaration?.loanSummary?.emi)}
              </div>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                @ {declaration?.loanSummary?.interestRate}% p.a. (IRR: {declaration?.loanSummary?.irr}%)
              </span>
            </div>

            {/* Net Disbursement */}
            <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4 dark:border-teal-900/40 dark:bg-teal-950/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                Net Disbursement
              </span>
              <div className="mt-1 text-lg font-black text-teal-800 dark:text-teal-300">
                {formatCurrency(declaration?.loanSummary?.netDisbursement)}
              </div>
              <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400">
                After ₹{declaration?.loanSummary?.totalCharges.toLocaleString('en-IN')} deductions
              </span>
            </div>

            {/* Disbursement Bank */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Target Account
                </span>
                <Landmark className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white truncate">
                {declaration?.disbursementBank?.bankName || 'Linked Bank Account'}
              </div>
              <span className="font-mono text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                {declaration?.disbursementBank?.accountNumberMasked || 'XXXX-XXXX-0000'}
              </span>
            </div>
          </div>

          {/* Scrollable Legal Clauses Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <div className="flex items-center space-x-1.5">
                <ScrollText className="h-4 w-4 text-emerald-600" />
                <span>Statutory Declarations & Consent Clauses (IT Act, 2000)</span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Scroll to read all 6 clauses
              </span>
            </div>

            <div
              role="region"
              aria-label="Statutory Declarations and Consent Clauses"
              tabIndex={0}
              className="max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-xs leading-relaxed text-slate-700 shadow-inner dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 space-y-3 scrollbar-thin focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              {declaration?.clauses.map((clause, idx) => (
                <div key={idx} className="flex items-start space-x-2.5 rounded-xl bg-white p-3 shadow-xs dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {idx + 1}
                  </span>
                  <p className="text-[11px] leading-relaxed text-slate-800 dark:text-slate-200">
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
            className={`flex cursor-pointer items-start space-x-3 rounded-2xl border p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
              hasAgreed
                ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/20 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-200'
                : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900'
            }`}
          >
            <div className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400">
              {hasAgreed ? (
                <CheckSquare className="h-5 w-5 text-emerald-600" />
              ) : (
                <Square className="h-5 w-5 text-slate-400" />
              )}
            </div>
            <div className="space-y-0.5 text-xs">
              <span className="font-bold text-slate-900 dark:text-white">
                I accept and agree to all terms of the loan sanction and borrower declaration.
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
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
              className="text-xs font-semibold"
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
            className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-md shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
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
