'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CustomerRoute } from '../../../components/auth/route-guards';
import { LoanStepper } from '../../../components/loan/loan-stepper';
import { SelfieCapture } from '../../../components/loan/selfie-capture';
import { useAuth } from '../../../contexts/auth-context';

export default function SelfiePage() {
  const { application } = useAuth();
  const router = useRouter();

  return (
    <CustomerRoute>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 pb-16">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Biometric Selfie Verification
          </h1>
          <p className="text-xs text-slate-500">
            Step 7 of 8: Real-time face capture for identity cross-verification
          </p>
        </div>

        <LoanStepper currentStage={application?.stage || 'DECLARATION_CONFIRMED'} activeStep={6} />

        <SelfieCapture
          onSuccess={() => {
            // Already shows celebration review screen on success
          }}
          onBack={() => {
            router.push('/apply/declaration');
          }}
        />
      </div>
    </CustomerRoute>
  );
}
