'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  TrendingUp,
  Lock,
  ArrowRight,
  User,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ChevronRight,
  Banknote,
  Percent,
} from 'lucide-react';
import { useAuth, ApplicationStage } from '../contexts/auth-context';
import { LoanStepper, ONBOARDING_STEPS } from '../components/loan/loan-stepper';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { HealthChecker } from '../components/health-checker';

const DEMO_STAGES: { stage: ApplicationStage; label: string; desc: string }[] = [
  {
    stage: 'SIGNUP_COMPLETED',
    label: '1. Account Created',
    desc: 'Dual 2FA email/phone verification pending',
  },
  {
    stage: 'KYC_PENDING',
    label: '2. 2FA Verified',
    desc: 'User ready to submit PAN/Aadhaar details',
  },
  {
    stage: 'KYC_SUBMITTED',
    label: '3. KYC Submitted',
    desc: 'Ready for automated underwriting evaluation',
  },
  {
    stage: 'ELIGIBILITY_CHECKED',
    label: '4. Eligible',
    desc: 'CIBIL score checked; customize EMI terms',
  },
  {
    stage: 'EMI_SELECTED',
    label: '5. EMI Confirmed',
    desc: 'Ready to link disbursement bank account',
  },
  {
    stage: 'BANK_ADDED',
    label: '6. Bank Added',
    desc: 'Ready to e-sign legal loan agreement',
  },
  {
    stage: 'DECLARATION_CONFIRMED',
    label: '7. Declaration Signed',
    desc: 'Ready for live selfie identity photo',
  },
  {
    stage: 'WAITING_ADMIN_REVIEW',
    label: '8. Selfie Uploaded',
    desc: 'Underwriter review pending in admin queue',
  },
  {
    stage: 'APPROVED',
    label: '9. Sanctioned',
    desc: 'Selfie approved; ready for disbursement',
  },
  {
    stage: 'DISBURSED',
    label: '10. Disbursed',
    desc: 'Funds transferred to linked bank account',
  },
  {
    stage: 'REJECTED',
    label: '11. Rejected',
    desc: 'Selfie or underwriting criteria not met',
  },
];

export default function HomePage() {
  const { user, role, isAuthenticated, application, setMockSession, logout } =
    useAuth();

  // Selected stage for interactive stepper preview
  const [previewStage, setPreviewStage] = useState<ApplicationStage>(
    application?.stage || 'WAITING_ADMIN_REVIEW'
  );
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | undefined>(
    undefined
  );

  const handleStageSelect = (stage: ApplicationStage) => {
    setPreviewStage(stage);
    setSelectedStepIndex(undefined);
  };

  const handleSimulateCustomer = () => {
    setMockSession(
      {
        id: 'cust_user_demo_101',
        email: 'rahul.sharma@example.com',
        phone: '9876543210',
        role: 'CUSTOMER',
        emailVerified: true,
        phoneVerified: true,
      },
      {
        id: 'app_demo_202',
        userId: 'cust_user_demo_101',
        stage: previewStage,
      }
    );
  };

  const handleSimulateAdmin = () => {
    setMockSession(
      {
        id: 'admin_user_demo_999',
        email: 'operations.lead@ezfinanz.com',
        phone: '9899001122',
        role: 'ADMIN',
        emailVerified: true,
        phoneVerified: true,
      },
      null
    );
  };

  const handleSimulateGuest = () => {
    logout();
  };

  return (
    <div className="space-y-12 pb-20">
      {/* 1. Hero FinTech Header Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 px-4 pt-20 pb-24 text-white sm:px-6 lg:px-8">
        {/* Glow ambient backgrounds */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-96 w-[700px] rounded-full bg-emerald-600/15 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-teal-500/10 blur-[90px] pointer-events-none" />

        <div className="relative mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center space-x-2 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-4 py-1.5 text-xs font-bold text-emerald-300 shadow-inner backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>Digital Retail Lending Platform</span>
          </div>

          <h1 className="mt-6 text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            Instant Personal Loans <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-emerald-200 bg-clip-text text-transparent">
              Powered by Pure Digital Underwriting
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
            Complete 8-step borrower onboarding journey with automated CIBIL
            scoring, Newton-Raphson IRR calculation, bank account verification,
            and administrative sanction review.
          </p>

          {/* Quick CTA Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup" className="inline-flex">
              <Button
                size="lg"
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black shadow-emerald-glow text-sm px-7 h-13 rounded-xl inline-flex items-center justify-center gap-2"
              >
                <span>Apply for Loan</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Button>
            </Link>

            <Link href="/login" className="inline-flex">
              <Button
                size="lg"
                variant="outline"
                className="border-slate-700 bg-slate-800/80 text-white hover:bg-slate-700 text-sm px-7 h-13 font-bold rounded-xl inline-flex items-center justify-center gap-2"
              >
                <span>Sign In to Application</span>
              </Button>
            </Link>

            {role === 'ADMIN' && (
              <Link href="/admin" className="inline-flex">
                <Button
                  size="lg"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm px-6 h-13 rounded-xl inline-flex items-center justify-center gap-2"
                >
                  <Lock className="h-4 w-4 shrink-0" />
                  <span>Admin Dashboard</span>
                </Button>
              </Link>
            )}
          </div>

          {/* Trust Highlights */}
          <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-4xl mx-auto pt-8 border-t border-slate-800 text-left">
            <div className="flex items-start space-x-3">
              <div className="rounded-xl bg-emerald-950/80 p-2.5 border border-emerald-500/20 text-emerald-400 shrink-0">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Instant Approval</p>
                <p className="text-[11px] text-slate-400">Pure automated rules</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="rounded-xl bg-teal-950/80 p-2.5 border border-teal-500/20 text-teal-400 shrink-0">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">₹50k - ₹10 Lakhs</p>
                <p className="text-[11px] text-slate-400">6 to 36 mo tenure</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="rounded-xl bg-indigo-950/80 p-2.5 border border-indigo-500/20 text-indigo-400 shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Dual 2FA Security</p>
                <p className="text-[11px] text-slate-400">Email & Phone OTP</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="rounded-xl bg-cyan-950/80 p-2.5 border border-cyan-500/20 text-cyan-400 shrink-0">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Direct Disbursement</p>
                <p className="text-[11px] text-slate-400">Direct to Bank A/C</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Multi-Step Stepper Playground */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <Layers className="h-4 w-4" />
              <span>CORE WORKFLOW COMPONENT</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Reusable 8-Step Onboarding Stepper
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Dynamically reads the active stage from the application record and
              updates stepper progress, badges, and step states.
            </p>
          </div>

          {/* Interactive Stage Selector Controls */}
          <div className="flex items-center space-x-2">
            <label htmlFor="preview-stage-select" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Preview Stage:
            </label>
            <select
              id="preview-stage-select"
              aria-label="Preview onboarding stage"
              value={previewStage}
              onChange={(e) =>
                handleStageSelect(e.target.value as ApplicationStage)
              }
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-xs focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {DEMO_STAGES.map((s) => (
                <option key={s.stage} value={s.stage}>
                  {s.label} ({s.stage})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Stepper Component */}
        <LoanStepper
          currentStage={previewStage}
          activeStep={selectedStepIndex}
          onStepClick={(stepIdx) => setSelectedStepIndex(stepIdx)}
        />

        {/* Stage Selection Pills */}
        <div className="mt-4 flex flex-wrap gap-2 pt-2">
          {DEMO_STAGES.map((s) => (
            <button
              key={s.stage}
              onClick={() => handleStageSelect(s.stage)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer ${
                previewStage === s.stage
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {/* 3. Auth State Context & Route Protection Demonstrator */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Interactive Session Simulator */}
          <Card className="border-slate-200/80 shadow-fintech rounded-2xl">
            <CardHeader>
              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
                <User className="h-5 w-5" />
                <CardTitle className="text-base font-bold">
                  Auth Context Simulator
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-600 dark:text-slate-400">
                Switch authentication state instantly to test role-based UI
                behavior.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start text-xs font-bold rounded-xl h-10"
                onClick={handleSimulateCustomer}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mr-2 shrink-0" />
                Simulate Borrower (Customer Role)
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start text-xs font-bold rounded-xl h-10"
                onClick={handleSimulateAdmin}
              >
                <Lock className="h-3.5 w-3.5 text-rose-600 mr-2 shrink-0" />
                Simulate Underwriter (Admin Role)
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start text-xs font-bold text-slate-600 dark:text-slate-400 rounded-xl h-10"
                onClick={handleSimulateGuest}
              >
                <AlertCircle className="h-3.5 w-3.5 mr-2 shrink-0" />
                Simulate Unauthenticated Guest
              </Button>
            </CardContent>
          </Card>

          {/* Center: Live Session State Display */}
          <Card className="border-slate-200/80 shadow-fintech rounded-2xl">
            <CardHeader>
              <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
                <Sparkles className="h-5 w-5" />
                <CardTitle className="text-base font-bold">
                  Current Session State
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-600 dark:text-slate-400">
                Live reactive values stored in React AuthContext.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-500">Authenticated:</span>
                <span className="font-bold">{isAuthenticated ? 'YES' : 'NO'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-500">Current Role:</span>
                <Badge variant={role === 'ADMIN' ? 'destructive' : 'default'} className="text-[10px]">
                  {role}
                </Badge>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-500">User Email:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {user?.email || 'None (Guest)'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-semibold text-slate-500">Application Stage:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {application?.stage || 'No Active Application'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Right: Backend API Health Checker Widget */}
          <HealthChecker />
        </div>
      </section>
    </div>
  );
}
