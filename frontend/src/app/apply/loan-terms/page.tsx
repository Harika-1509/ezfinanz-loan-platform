'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CustomerRoute } from '../../../components/auth/route-guards';
import { LoanStepper } from '../../../components/loan/loan-stepper';
import { LoanTermsCalculator } from '../../../components/loan/loan-terms-calculator';
import { useAuth } from '../../../contexts/auth-context';

export default function LoanTermsPage() {
  const router = useRouter();
  const { application } = useAuth();

  const handleSuccess = () => {
    // Navigate to next step: Bank Account Addition (or main coordinator)
    router.push('/apply');
  };

  return (
    <CustomerRoute>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Progress Stepper */}
          <div className="mb-8 rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-glass backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
            <LoanStepper currentStage={application?.stage || 'ELIGIBILITY_CHECKED'} />
          </div>

          {/* EMI & Terms Calculator */}
          <LoanTermsCalculator onSuccess={handleSuccess} />
        </div>
      </div>
    </CustomerRoute>
  );
}
