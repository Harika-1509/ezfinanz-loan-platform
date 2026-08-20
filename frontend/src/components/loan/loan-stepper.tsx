'use client';

import React, { useRef, useEffect } from 'react';
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
  Sparkles,
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
        color: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80',
        icon: Clock,
      };
    case 'VERIFIED':
    case 'KYC_PENDING':
      return {
        label: 'KYC Pending',
        color: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/80',
        icon: Clock,
      };
    case 'KYC_SUBMITTED':
      return {
        label: 'KYC Submitted',
        color: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/80',
        icon: Clock,
      };
    case 'ELIGIBILITY_CHECKED':
      return {
        label: 'Eligibility Checked',
        color: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/80',
        icon: TrendingUp,
      };
    case 'EMI_SELECTED':
      return {
        label: 'EMI Selected',
        color: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80',
        icon: Calculator,
      };
    case 'BANK_ADDED':
      return {
        label: 'Bank Account Linked',
        color: 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/80',
        icon: Landmark,
      };
    case 'DECLARATION_CONFIRMED':
    case 'SELFIE_PENDING':
      return {
        label: 'Selfie Pending',
        color: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/80',
        icon: Camera,
      };
    case 'WAITING_ADMIN_REVIEW':
      return {
        label: 'Waiting Admin Review',
        color: 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80',
        icon: Clock,
      };
    case 'APPROVED':
      return {
        label: 'Approved (Ready)',
        color: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80',
        icon: Check,
      };
    case 'DISBURSED':
      return {
        label: 'Funds Disbursed',
        color: 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-glow',
        icon: Banknote,
      };
    case 'REJECTED':
      return {
        label: 'Application Rejected',
        color: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/80',
        icon: AlertCircle,
      };
    default:
      return {
        label: 'Application Initiated',
        color: 'bg-slate-100 text-slate-900 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
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
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  // Calculate percentage completion (0% to 100%)
  const progressPercent = isDisbursed
    ? 100
    : Math.round((currentActive / (ONBOARDING_STEPS.length - 1)) * 100);

  const stageBadge = getStageBadge(currentStage);
  const BadgeIcon = stageBadge.icon;

  // Auto-scroll active step into view on mobile
  useEffect(() => {
    if (mobileScrollRef.current) {
      const activeEl = mobileScrollRef.current.querySelector('[aria-current="step"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [currentActive]);

  return (
    <nav
      aria-label="Loan Onboarding Progress"
      className={cn(
        'w-full rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-fintech backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/95 md:p-6',
        className
      )}
    >
      {/* Header bar with progress overview and stage badge */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Loan Application Journey
            </span>
            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">•</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Step {currentActive + 1} of {ONBOARDING_STEPS.length}
            </span>
          </div>
          <h2 className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white sm:text-xl">
            {ONBOARDING_STEPS[currentActive]?.title || 'Onboarding Journey'}
          </h2>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden sm:block text-right">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Progress</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
              {progressPercent}% Complete
            </div>
          </div>

          <div
            className={cn(
              'inline-flex items-center space-x-1.5 rounded-full border px-3 py-1 text-xs font-bold shadow-xs',
              stageBadge.color
            )}
          >
            <BadgeIcon className="h-3.5 w-3.5" />
            <span>{stageBadge.label}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar Track */}
      <div
        className="relative mb-6 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Application Completion"
      >
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out rounded-full',
            isRejected
              ? 'bg-rose-500'
              : 'bg-gradient-to-r from-teal-500 via-emerald-500 to-emerald-600 shadow-emerald-glow'
          )}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Desktop Horizontal Stepper Grid */}
      <ol className="hidden lg:grid lg:grid-cols-8 lg:gap-2 list-none p-0 m-0">
        {ONBOARDING_STEPS.map((step, idx) => {
          const isCompleted = idx < derivedStep || isDisbursed;
          const isCurrent = idx === currentActive;
          const isPending = idx > derivedStep && !isDisbursed;
          const isStepRejected = isRejected && idx === 7;
          const Icon = step.icon;
          const statusText = isCompleted ? 'completed' : isCurrent ? 'current step' : 'upcoming step';

          return (
            <li key={step.id} className="relative">
              <button
                type="button"
                disabled={isPending && !onStepClick}
                onClick={() => onStepClick && onStepClick(idx)}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`Step ${step.number}: ${step.title} (${statusText})`}
                className={cn(
                  'group flex w-full flex-col items-center text-center transition-all duration-200 rounded-xl p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
                  isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50'
                )}
              >
                {/* Step Circle with Icon / Checkmark */}
                <div
                  className={cn(
                    'relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300',
                    isCompleted &&
                      'border-emerald-600 bg-emerald-600 text-white shadow-xs',
                    isCurrent &&
                      !isStepRejected &&
                      'border-emerald-600 bg-white text-emerald-700 ring-4 ring-emerald-500/20 shadow-emerald-glow dark:bg-slate-900 dark:text-emerald-400',
                    isPending &&
                      'border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400',
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
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-[9px] font-bold text-white shadow-xs dark:bg-slate-100 dark:text-slate-900">
                    {step.number}
                  </span>
                </div>

                {/* Title & description */}
                <div className="mt-2.5 w-full px-0.5">
                  <span
                    className={cn(
                      'block text-xs font-bold leading-tight transition-colors truncate',
                      isCurrent
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : isCompleted
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-500 dark:text-slate-400'
                    )}
                  >
                    {step.shortTitle}
                  </span>
                  <span className="mt-0.5 hidden xl:block text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 font-medium">
                    {step.description}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Mobile & Tablet Compact Stepper Carousel with snap scrolling */}
      <div
        ref={mobileScrollRef}
        className="flex lg:hidden overflow-x-auto pb-2 scrollbar-none space-x-2.5 snap-x snap-mandatory"
      >
        {ONBOARDING_STEPS.map((step, idx) => {
          const isCompleted = idx < derivedStep || isDisbursed;
          const isCurrent = idx === currentActive;
          const isPending = idx > derivedStep && !isDisbursed;
          const isStepRejected = isRejected && idx === 7;
          const Icon = step.icon;
          const statusText = isCompleted ? 'completed' : isCurrent ? 'current step' : 'upcoming step';

          return (
            <button
              key={step.id}
              type="button"
              disabled={isPending && !onStepClick}
              onClick={() => onStepClick && onStepClick(idx)}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={`Step ${step.number}: ${step.title} (${statusText})`}
              className={cn(
                'flex flex-shrink-0 items-center space-x-2 rounded-xl border px-3 py-2 text-left transition-all snap-start min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
                isCurrent
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs ring-1 ring-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-200'
                  : isCompleted
                  ? 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200'
                  : 'border-slate-200 bg-slate-50/40 text-slate-500 opacity-60 dark:border-slate-800/50 dark:bg-slate-900/40 dark:text-slate-400'
              )}
            >
              <div
                className={cn(
                  'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  isCompleted && 'bg-emerald-600 text-white',
                  isCurrent && !isStepRejected && 'bg-emerald-600 text-white',
                  isPending && 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
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
    </nav>
  );
}
