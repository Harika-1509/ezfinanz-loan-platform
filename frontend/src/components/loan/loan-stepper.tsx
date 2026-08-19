'use client';

import React from 'react';
import {
  ShieldCheck,
  UserCheck,
  TrendingUp,
  Calculator,
  Landmark,
  FileCheck2,
  Camera,
  Banknote,
  Check,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { ApplicationStage } from '../../contexts/auth-context';
import { cn } from '../../lib/utils';

export interface StepDefinition {
  id: string;
  number: number;
  title: string;
  shortTitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  associatedStages: ApplicationStage[];
}

export const ONBOARDING_STEPS: StepDefinition[] = [
  {
    id: 'verification',
    number: 1,
    title: 'Dual 2FA Verification',
    shortTitle: 'Verification',
    description: 'Email & Phone OTP verification',
    icon: ShieldCheck,
    associatedStages: ['SIGNUP_COMPLETED', 'VERIFICATION_PENDING', 'VERIFIED'],
  },
  {
    id: 'kyc',
    number: 2,
    title: 'KYC Document Details',
    shortTitle: 'KYC Details',
    description: 'PAN & Aadhaar identity verification',
    icon: UserCheck,
    associatedStages: ['KYC_PENDING', 'KYC_SUBMITTED'],
  },
  {
    id: 'eligibility',
    number: 3,
    title: 'Credit & Eligibility Check',
    shortTitle: 'Eligibility',
    description: 'Automated underwriting & credit score',
    icon: TrendingUp,
    associatedStages: ['ELIGIBILITY_CHECKED'],
  },
  {
    id: 'loan-terms',
    number: 4,
    title: 'EMI Terms & Tenure',
    shortTitle: 'Loan Terms',
    description: 'Custom tenure & repayment calculation',
    icon: Calculator,
    associatedStages: ['EMI_SELECTED'],
  },
  {
    id: 'bank-account',
    number: 5,
    title: 'Disbursement Bank Account',
    shortTitle: 'Bank Account',
    description: 'Link account for fund transfer',
    icon: Landmark,
    associatedStages: ['BANK_ADDED'],
  },
  {
    id: 'declaration',
    number: 6,
    title: 'Legal Terms Declaration',
    shortTitle: 'Declaration',
    description: 'Review & e-sign loan agreement',
    icon: FileCheck2,
    associatedStages: ['DECLARATION_CONFIRMED'],
  },
  {
    id: 'selfie',
    number: 7,
    title: 'Live Selfie Verification',
    shortTitle: 'Selfie Photo',
    description: 'Biometric identity capture',
    icon: Camera,
    associatedStages: ['SELFIE_PENDING', 'WAITING_ADMIN_REVIEW'],
  },
  {
    id: 'disbursement',
    number: 8,
    title: 'Sanction & Disbursement',
    shortTitle: 'Disbursement',
    description: 'Admin sanction & instantaneous payout',
    icon: Banknote,
    associatedStages: ['APPROVED', 'DISBURSED', 'REJECTED'],
  },
];

/**
 * Maps any ApplicationStage to the current active 0-indexed step number (0 to 7)
 */
export function getStepIndexFromStage(stage?: ApplicationStage | null): number {
  if (!stage) return 0;

  switch (stage) {
    case 'SIGNUP_COMPLETED':
    case 'VERIFICATION_PENDING':
      return 0; // Step 1: Verification
    case 'VERIFIED':
    case 'KYC_PENDING':
      return 1; // Step 2: KYC
    case 'KYC_SUBMITTED':
      return 2; // Step 3: Eligibility
    case 'ELIGIBILITY_CHECKED':
      return 3; // Step 4: Loan Terms
    case 'EMI_SELECTED':
      return 4; // Step 5: Bank Account
    case 'BANK_ADDED':
      return 5; // Step 6: Declaration
    case 'DECLARATION_CONFIRMED':
    case 'SELFIE_PENDING':
      return 6; // Step 7: Selfie
    case 'WAITING_ADMIN_REVIEW':
    case 'APPROVED':
    case 'DISBURSED':
    case 'REJECTED':
      return 7; // Step 8: Admin Review & Payout
    default:
      return 0;
  }
}

/**
 * Returns human-readable label and color badge for a stage
 */
export function getStageBadge(stage?: ApplicationStage | null): {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
} {
  switch (stage) {
    case 'SIGNUP_COMPLETED':
    case 'VERIFICATION_PENDING':
      return {
        label: 'Verification Pending',
        color: 'bg-amber-100 text-amber-800 border-amber-300',
        icon: Clock,
      };
    case 'VERIFIED':
    case 'KYC_PENDING':
      return {
        label: 'KYC Pending',
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: Clock,
      };
    case 'KYC_SUBMITTED':
      return {
        label: 'KYC Submitted',
        color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        icon: Clock,
      };
    case 'ELIGIBILITY_CHECKED':
      return {
        label: 'Eligibility Checked',
        color: 'bg-teal-100 text-teal-800 border-teal-300',
        icon: TrendingUp,
      };
    case 'EMI_SELECTED':
      return {
        label: 'EMI Selected',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        icon: Calculator,
      };
    case 'BANK_ADDED':
      return {
        label: 'Bank Account Linked',
        color: 'bg-cyan-100 text-cyan-800 border-cyan-300',
        icon: Landmark,
      };
    case 'DECLARATION_CONFIRMED':
    case 'SELFIE_PENDING':
      return {
        label: 'Selfie Pending',
        color: 'bg-purple-100 text-purple-800 border-purple-300',
        icon: Camera,
      };
    case 'WAITING_ADMIN_REVIEW':
      return {
        label: 'Waiting Admin Review',
        color: 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse',
        icon: Clock,
      };
    case 'APPROVED':
      return {
        label: 'Approved (Disbursement Ready)',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        icon: Check,
      };
    case 'DISBURSED':
      return {
        label: 'Funds Disbursed',
        color: 'bg-emerald-600 text-white border-emerald-700 shadow-glow',
        icon: Banknote,
      };
    case 'REJECTED':
      return {
        label: 'Application Rejected',
        color: 'bg-rose-100 text-rose-800 border-rose-300',
        icon: AlertCircle,
      };
    default:
      return {
        label: 'Application Initiated',
        color: 'bg-slate-100 text-slate-800 border-slate-300',
        icon: Clock,
      };
  }
}

interface LoanStepperProps {
  currentStage?: ApplicationStage | null;
  activeStep?: number;
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

export function LoanStepper({
  currentStage = 'SIGNUP_COMPLETED',
  activeStep,
  onStepClick,
  className,
}: LoanStepperProps) {
  const derivedStep = getStepIndexFromStage(currentStage);
  const currentActive = activeStep !== undefined ? activeStep : derivedStep;
  const isRejected = currentStage === 'REJECTED';
  const isDisbursed = currentStage === 'DISBURSED';

  // Calculate percentage completion (0% to 100%)
  const progressPercent = isDisbursed
    ? 100
    : Math.round((currentActive / (ONBOARDING_STEPS.length - 1)) * 100);

  const stageBadge = getStageBadge(currentStage);
  const BadgeIcon = stageBadge.icon;

  return (
    <div
      className={cn(
        'w-full rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-glass backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 md:p-6',
        className
      )}
    >
      {/* Header bar with progress overview and stage badge */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Loan Application Journey
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-xs font-medium text-slate-500">
              Step {currentActive + 1} of {ONBOARDING_STEPS.length}
            </span>
          </div>
          <h2 className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white sm:text-xl">
            {ONBOARDING_STEPS[currentActive]?.title || 'Onboarding Journey'}
          </h2>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden sm:block text-right">
            <div className="text-xs font-medium text-slate-500">Progress</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {progressPercent}% Complete
            </div>
          </div>

          <div
            className={cn(
              'inline-flex items-center space-x-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
              stageBadge.color
            )}
          >
            <BadgeIcon className="h-3.5 w-3.5" />
            <span>{stageBadge.label}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar Track */}
      <div className="relative mb-6 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out',
            isRejected
              ? 'bg-rose-500'
              : 'bg-gradient-to-r from-teal-500 via-emerald-500 to-emerald-600 shadow-glow'
          )}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Desktop Horizontal Stepper Grid */}
      <div className="hidden lg:grid lg:grid-cols-8 lg:gap-2">
        {ONBOARDING_STEPS.map((step, idx) => {
          const isCompleted = idx < derivedStep || isDisbursed;
          const isCurrent = idx === currentActive;
          const isPending = idx > derivedStep && !isDisbursed;
          const isStepRejected = isRejected && idx === 7;
          const Icon = step.icon;

          return (
            <button
              key={step.id}
              type="button"
              disabled={isPending && !onStepClick}
              onClick={() => onStepClick && onStepClick(idx)}
              className={cn(
                'group flex flex-col items-center text-center transition-all duration-200',
                isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              )}
            >
              {/* Step Circle with Icon / Checkmark */}
              <div
                className={cn(
                  'relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300',
                  isCompleted &&
                    'border-emerald-600 bg-emerald-600 text-white shadow-sm',
                  isCurrent &&
                    !isStepRejected &&
                    'border-emerald-600 bg-white text-emerald-700 ring-4 ring-emerald-500/20 shadow-glow dark:bg-slate-900 dark:text-emerald-400',
                  isPending &&
                    'border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500',
                  isStepRejected &&
                    'border-rose-600 bg-rose-600 text-white ring-4 ring-rose-500/20'
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5 stroke-[2.5]" />
                ) : isStepRejected ? (
                  <AlertCircle className="h-5 w-5" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}

                {/* Step number badge */}
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-[9px] font-bold text-white shadow dark:bg-slate-100 dark:text-slate-900">
                  {step.number}
                </span>
              </div>

              {/* Title & description */}
              <div className="mt-2.5">
                <span
                  className={cn(
                    'block text-xs font-semibold leading-tight transition-colors',
                    isCurrent
                      ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                      : isCompleted
                      ? 'text-slate-800 dark:text-slate-200'
                      : 'text-slate-400 dark:text-slate-600'
                  )}
                >
                  {step.shortTitle}
                </span>
                <span className="mt-0.5 hidden xl:block text-[10px] text-slate-400 dark:text-slate-500 line-clamp-1">
                  {step.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Mobile & Tablet Compact Stepper Carousel / Scroll View */}
      <div className="flex lg:hidden overflow-x-auto pb-2 scrollbar-none space-x-3">
        {ONBOARDING_STEPS.map((step, idx) => {
          const isCompleted = idx < derivedStep || isDisbursed;
          const isCurrent = idx === currentActive;
          const isPending = idx > derivedStep && !isDisbursed;
          const isStepRejected = isRejected && idx === 7;
          const Icon = step.icon;

          return (
            <button
              key={step.id}
              type="button"
              disabled={isPending && !onStepClick}
              onClick={() => onStepClick && onStepClick(idx)}
              className={cn(
                'flex flex-shrink-0 items-center space-x-2 rounded-xl border px-3 py-2 text-left transition-all',
                isCurrent
                  ? 'border-emerald-500 bg-emerald-50/80 text-emerald-950 shadow-sm ring-1 ring-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-200'
                  : isCompleted
                  ? 'border-slate-200 bg-slate-50/70 text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300'
                  : 'border-slate-200/50 bg-slate-50/30 text-slate-400 opacity-60 dark:border-slate-800/40 dark:bg-slate-900/30'
              )}
            >
              <div
                className={cn(
                  'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  isCompleted && 'bg-emerald-600 text-white',
                  isCurrent && !isStepRejected && 'bg-emerald-600 text-white',
                  isPending && 'bg-slate-200 text-slate-500 dark:bg-slate-800',
                  isStepRejected && 'bg-rose-600 text-white'
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold leading-none truncate">
                  {step.number}. {step.shortTitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
