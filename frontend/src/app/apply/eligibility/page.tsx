'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CustomerRoute } from '../../../components/auth/route-guards';
import { LoanStepper } from '../../../components/loan/loan-stepper';
import { EligibilityForm } from '../../../components/loan/eligibility-form';
import { useAuth } from '../../../contexts/auth-context';

export default function EligibilityPage() {
  const { application } = useAuth();
  const router = useRouter();

  return (
    <CustomerRoute>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 pb-16">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Loan Underwriting & Financial Eligibility
          </h1>
          <p className="text-xs text-slate-500">
            Step 3 of 8: Automated CIBIL bureau scoring and DTI calculation
          </p>
        </div>

        <LoanStepper currentStage={application?.stage || 'ELIGIBILITY_CHECKED'} activeStep={2} />

        <EligibilityForm
          onSuccess={() => {
            router.push('/apply');
          }}
        />
      </div>
    </CustomerRoute>
  );
}
