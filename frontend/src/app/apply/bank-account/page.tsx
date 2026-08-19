'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CustomerRoute } from '../../../components/auth/route-guards';
import { LoanStepper } from '../../../components/loan/loan-stepper';
import { BankAccountForm } from '../../../components/loan/bank-account-form';
import { useAuth } from '../../../contexts/auth-context';

export default function BankAccountPage() {
  const { application } = useAuth();
  const router = useRouter();

  return (
    <CustomerRoute>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 pb-16">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Disbursement Bank Account
          </h1>
          <p className="text-xs text-slate-500">
            Step 5 of 8: Add the validated bank account for loan credit
          </p>
        </div>

        <LoanStepper currentStage={application?.stage || 'EMI_SELECTED'} activeStep={4} />

        <BankAccountForm
          onSuccess={() => {
            router.push('/apply/declaration');
          }}
          onBack={() => {
            router.push('/apply/loan-terms');
          }}
        />
      </div>
    </CustomerRoute>
  );
}
