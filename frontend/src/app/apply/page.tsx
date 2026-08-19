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
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-xs font-semibold text-slate-500">
              Loading your loan application...
            </p>
          </div>
        </div>
      </CustomerRoute>
    );
  }

  return (
    <CustomerRoute>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 pb-16">
        {/* Onboarding Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-4 w-4" />
              <span>DIGITAL LOAN ONBOARDING</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Personal Loan Application
            </h1>
            <p className="text-xs text-slate-500">
              Application ID:{' '}
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                {application?.id || 'APP-ACTIVE'}
              </span>{' '}
              • Registered to {user?.email || user?.phone}
            </p>
          </div>

          <Badge variant="outline" className="self-start sm:self-auto text-xs py-1 px-3">
            Stage: <span className="font-bold ml-1 text-emerald-600">{currentStage}</span>
          </Badge>
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
                  className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
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
