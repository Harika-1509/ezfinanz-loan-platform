'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  FileText,
  Calculator,
  Percent,
  Landmark,
  FileCheck,
  Camera,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Sparkles,
  Loader2,
  RotateCcw,
  Check,
  Lock,
} from 'lucide-react';
import { useAuth, ApplicationStage } from '../../contexts/auth-context';
import { apiClient } from '../../lib/api-client';
import { CustomerRoute } from '../../components/auth/route-guards';
import { LoanStepper } from '../../components/loan/loan-stepper';
import { KycForm } from '../../components/loan/kyc-form';
import { EligibilityForm } from '../../components/loan/eligibility-form';
import { LoanTermsCalculator } from '../../components/loan/loan-terms-calculator';
import { BankAccountForm } from '../../components/loan/bank-account-form';
import { DeclarationForm } from '../../components/loan/declaration-form';
import { SelfieCapture } from '../../components/loan/selfie-capture';
import { CustomerDashboard } from '../../components/loan/customer-dashboard';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';

export default function ApplyPage() {
  const { user, application, updateApplicationStage } = useAuth();
  const router = useRouter();

  const [currentStage, setCurrentStage] = useState<ApplicationStage>(
    application?.stage || 'KYC_PENDING'
  );
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Sync latest stage from backend
  const syncStage = useCallback(async () => {
    try {
      const res = await apiClient.get<{
        user: any;
        application: { id: string; stage: ApplicationStage };
      }>('/auth/me');

      if (res.data?.application?.stage) {
        const s = res.data.application.stage;
        setCurrentStage(s);
        if (application?.stage !== s) {
          updateApplicationStage(s);
        }

        // If unverified 2FA, redirect to /verify
        if (
          s === 'SIGNUP_COMPLETED' ||
          s === 'VERIFICATION_PENDING'
        ) {
          router.push('/verify');
        }
      }
    } catch {
      // Use existing context stage
    } finally {
      setIsInitializing(false);
    }
  }, [application?.stage, router, updateApplicationStage]);

  useEffect(() => {
    syncStage();
  }, [syncStage]);

  // Keep local stage in sync with authContext
  useEffect(() => {
    if (application?.stage) {
      setCurrentStage(application.stage);
    }
  }, [application?.stage]);

  if (isInitializing) {
    return (
      <CustomerRoute>
        <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="mx-auto h-9 w-9 animate-spin text-emerald-600" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Loading your loan application session...
            </p>
          </div>
        </div>
      </CustomerRoute>
    );
  }

  return (
    <CustomerRoute>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 pb-20">
        {/* Onboarding Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-6">
          <div>
            <div className="inline-flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>DIGITAL LOAN APPLICATION</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
              Personal Loan Underwriting
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Ref ID:{' '}
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {application?.id || 'APP-ACTIVE'}
              </span>{' '}
              • Verified Applicant: <strong className="text-slate-700 dark:text-slate-300">{user?.email || user?.phone}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" dot className="self-start sm:self-auto text-xs py-1.5 px-3.5 font-bold shadow-xs">
              Stage: <span className="font-extrabold ml-1 text-emerald-700 dark:text-emerald-400">{currentStage.replace(/_/g, ' ')}</span>
            </Badge>
          </div>
        </div>

        {/* Reusable 8-Step Stepper Component */}
        <LoanStepper currentStage={currentStage} />

        {/* Dynamic Stage Render Area */}
        <div className="pt-2">
          {/* Stage 1: KYC Form (Step 2 of 8) */}
          {currentStage === 'KYC_PENDING' && (
            <KycForm
              onSuccess={() => {
                setCurrentStage('KYC_SUBMITTED');
                updateApplicationStage('KYC_SUBMITTED');
              }}
            />
          )}

          {/* Stage 2: Eligibility Underwriting (Step 3 of 8) */}
          {currentStage === 'KYC_SUBMITTED' && (
            <EligibilityForm
              onSuccess={() => {
                setCurrentStage('ELIGIBILITY_CHECKED');
                updateApplicationStage('ELIGIBILITY_CHECKED');
              }}
            />
          )}

          {/* Stage 3: Loan Terms & Live EMI Selection (Step 4 of 8) */}
          {currentStage === 'ELIGIBILITY_CHECKED' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStage('KYC_SUBMITTED')}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  ← Back to Eligibility Assessment
                </Button>
              </div>

              <LoanTermsCalculator
                onSuccess={() => {
                  setCurrentStage('EMI_SELECTED');
                  updateApplicationStage('EMI_SELECTED');
                }}
              />
            </div>
          )}

          {/* Stage 4: Disbursement Bank Account Linking (Step 5 of 8) */}
          {currentStage === 'EMI_SELECTED' && (
            <BankAccountForm
              onSuccess={() => {
                setCurrentStage('BANK_ADDED');
                updateApplicationStage('BANK_ADDED');
              }}
              onBack={() => {
                setCurrentStage('ELIGIBILITY_CHECKED');
              }}
            />
          )}

          {/* Stage 5: Borrower Legal Undertaking & Declaration (Step 6 of 8) */}
          {currentStage === 'BANK_ADDED' && (
            <DeclarationForm
              onSuccess={() => {
                setCurrentStage('DECLARATION_CONFIRMED');
                updateApplicationStage('DECLARATION_CONFIRMED');
              }}
              onBack={() => {
                setCurrentStage('EMI_SELECTED');
              }}
            />
          )}

          {/* Stage 6 & 7: Biometric Selfie Verification Form */}
          {(currentStage === 'DECLARATION_CONFIRMED' ||
            currentStage === 'SELFIE_PENDING') && (
            <SelfieCapture
              onSuccess={() => {
                setCurrentStage('WAITING_ADMIN_REVIEW');
                updateApplicationStage('WAITING_ADMIN_REVIEW');
              }}
              onBack={() => setCurrentStage('BANK_ADDED')}
            />
          )}

          {/* Stage 8, 9, 10: Customer Status Dashboard (Underwriter Review, Approved, Disbursed, Rejected) */}
          {(currentStage === 'WAITING_ADMIN_REVIEW' ||
            currentStage === 'APPROVED' ||
            currentStage === 'DISBURSED' ||
            currentStage === 'REJECTED') && (
            <CustomerDashboard
              onNavigateToStage={(stage) => {
                setCurrentStage(stage);
                updateApplicationStage(stage);
              }}
            />
          )}
        </div>
      </div>
    </CustomerRoute>
  );
}
