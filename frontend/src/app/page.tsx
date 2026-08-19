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
    <div className="space-y-12 pb-16">
      {/* 1. Hero FinTech Header Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 px-4 pt-16 pb-20 text-white sm:px-6 lg:px-8">
        {/* Glow ambient backgrounds */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-96 w-[700px] rounded-full bg-emerald-600/15 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-teal-500/10 blur-[90px] pointer-events-none" />

        <div className="relative mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center space-x-2 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-4 py-1.5 text-xs font-semibold text-emerald-300 shadow-inner backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>Chunk 15: Frontend Foundation & Architecture</span>
          </div>

          <h1 className="mt-6 text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            Instant Personal Loans <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-emerald-200 bg-clip-text text-transparent">
              Powered by Pure Digital Underwriting
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
            Complete 8-step borrower onboarding journey with automated CIBIL
            scoring, Newton-Raphson IRR calculation, bank account verification,
            and administrative sanction review.
          </p>

          {/* Quick CTA Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup">
              <Button
                size="lg"
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold shadow-glow text-sm px-6 h-12"
              >
                Apply for Loan
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>

            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="border-slate-700 bg-slate-800/80 text-white hover:bg-slate-700 text-sm px-6 h-12"
              >
                Sign In to Application
              </Button>
            </Link>

            {role === 'ADMIN' && (
              <Link href="/admin">
                <Button
                  size="lg"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm px-6 h-12"
                >
                  <Lock className="mr-2 h-4 w-4" />
                  Admin Dashboard
                </Button>
              </Link>
            )}
          </div>

          {/* Trust Highlights */}
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-4xl mx-auto pt-8 border-t border-slate-800/80 text-left">
            <div className="flex items-start space-x-3">
              <div className="rounded-lg bg-emerald-950/80 p-2 border border-emerald-500/20 text-emerald-400">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Instant Approval</p>
                <p className="text-[11px] text-slate-400">Pure automated rules</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="rounded-lg bg-teal-950/80 p-2 border border-teal-500/20 text-teal-400">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">₹50k - ₹10 Lakhs</p>
                <p className="text-[11px] text-slate-400">6 to 36 mo tenure</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="rounded-lg bg-indigo-950/80 p-2 border border-indigo-500/20 text-indigo-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Dual 2FA Security</p>
                <p className="text-[11px] text-slate-400">Email & Phone OTP</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="rounded-lg bg-cyan-950/80 p-2 border border-cyan-500/20 text-cyan-400">
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
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-600">
              <Layers className="h-4 w-4" />
              <span>CORE COMPONENT</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Reusable 8-Step Onboarding Stepper
            </h2>
            <p className="text-sm text-slate-500">
              Dynamically reads the active stage from the application record and
              updates stepper progress, badges, and step states.
            </p>
          </div>

          {/* Interactive Stage Selector Controls */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-500">
              Preview Stage:
            </span>
            <select
              value={previewStage}
              onChange={(e) =>
                handleStageSelect(e.target.value as ApplicationStage)
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                previewStage === s.stage
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
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
          <Card className="border-slate-200/80 shadow-glass">
            <CardHeader>
              <div className="flex items-center space-x-2 text-emerald-600">
                <User className="h-5 w-5" />
                <CardTitle className="text-base font-bold">
                  Auth Context Simulator
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Switch authentication state instantly to test role-based UI
                behavior.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start text-xs font-medium"
                onClick={handleSimulateCustomer}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mr-2" />
                Simulate Borrower (Customer Role)
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start text-xs font-medium"
                onClick={handleSimulateAdmin}
              >
                <Lock className="h-3.5 w-3.5 text-rose-600 mr-2" />
                Simulate Underwriter (Admin Role)
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start text-xs font-medium text-slate-500"
                onClick={handleSimulateGuest}
              >
                <AlertCircle className="h-3.5 w-3.5 mr-2" />
                Simulate Logged-out Guest
              </Button>
            </CardContent>
          </Card>

          {/* Center: Live Auth State Inspector */}
          <Card className="border-slate-200/80 shadow-glass">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                Live Session Inspector
              </CardTitle>
              <CardDescription className="text-xs">
                Global state provided by <code>useAuth()</code> hook.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Status:</span>
                <span className="font-semibold">
                  {isAuthenticated ? (
                    <Badge variant="default" className="bg-emerald-600 text-white">
                      Authenticated
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Guest / Unauthenticated</Badge>
                  )}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Active Role:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {role || 'None'}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">User Email:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {user?.email || 'N/A'}
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-slate-500">Application Stage:</span>
                <span className="font-mono font-semibold text-emerald-600">
                  {application?.stage || previewStage}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Right: API Client & Route Guard Specs */}
          <Card className="border-slate-200/80 shadow-glass">
            <CardHeader>
              <div className="flex items-center space-x-2 text-teal-600">
                <ShieldCheck className="h-5 w-5" />
                <CardTitle className="text-base font-bold">
                  API & Route Guard Features
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Chunk 15 architectural foundations verified.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>Auto JWT injection (<code>Authorization: Bearer</code>)</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>Transparent 401 refresh token renewal queue</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>Role-based guard components (<code>AdminRoute</code>, <code>CustomerRoute</code>)</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>Zero-magic pure CSS design tokens with FinTech palette</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 4. Backend System Connectivity Health Checker */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <HealthChecker />
      </section>
    </div>
  );
}
