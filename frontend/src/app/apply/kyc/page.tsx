'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CustomerRoute } from '../../../components/auth/route-guards';
import { LoanStepper } from '../../../components/loan/loan-stepper';
import { KycForm } from '../../../components/loan/kyc-form';
import { useAuth } from '../../../contexts/auth-context';

export default function KycPage() {
  const { application } = useAuth();
  const router = useRouter();

  return (
    <CustomerRoute>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 pb-16">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Identity & KYC Document Verification
          </h1>
          <p className="text-xs text-slate-500">
            Step 2 of 8: Secure Aadhaar / PAN validation
          </p>
        </div>

        <LoanStepper currentStage={application?.stage || 'KYC_PENDING'} activeStep={1} />

        <KycForm
          onSuccess={() => {
            router.push('/apply');
          }}
        />
      </div>
    </CustomerRoute>
  );
}
