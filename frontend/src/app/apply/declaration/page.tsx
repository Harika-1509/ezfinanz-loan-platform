'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CustomerRoute } from '../../../components/auth/route-guards';
import { LoanStepper } from '../../../components/loan/loan-stepper';
import { DeclarationForm } from '../../../components/loan/declaration-form';
import { useAuth } from '../../../contexts/auth-context';

export default function DeclarationPage() {
  const { application } = useAuth();
  const router = useRouter();

  return (
    <CustomerRoute>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 pb-16">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Legal Declaration & Undertaking
          </h1>
          <p className="text-xs text-slate-500">
            Step 6 of 8: Mandatory borrower disclosures and electronic consent
          </p>
        </div>

        <LoanStepper currentStage={application?.stage || 'BANK_ADDED'} activeStep={5} />

        <DeclarationForm
          onSuccess={() => {
            router.push('/apply/selfie');
          }}
          onBack={() => {
            router.push('/apply/bank-account');
          }}
        />
      </div>
    </CustomerRoute>
  );
}
