'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Landmark,
  FileText,
  User,
  Camera,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Percent,
  Download,
  Calendar,
  Building2,
  Briefcase,
  HelpCircle,
  Layers,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Lock,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth, ApplicationStage } from '../../contexts/auth-context';
import { apiClient, ApiError } from '../../lib/api-client';
import { LoanStepper } from './loan-stepper';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

interface KycDetails {
  id: string;
  fullName: string;
  dob: string;
  gender: string;
  address: string;
  idType: string;
  idNumber: string;
  idPhotoUrl: string | null;
  createdAt: string;
}

interface EligibilityCheck {
  id: string;
  income: number;
  requestedAmount: number;
  existingDebts: number;
  employerName: string;
  designation: string;
  creditScore: number | null;
  creditTier: string | null;
  dtiRatio: number | null;
  maxEligibleAmount: number | null;
  interestRate: number | null;
  decision: string;
}

interface LoanTerms {
  id: string;
  amount: number;
  tenureMonths: number;
  interestRate: number;
  emi: number;
  processingFee: number;
  gst: number;
  adminCharges: number;
  totalDeductions: number;
  netDisbursement: number;
  totalInterest: number;
  totalRepayment: number;
  irr: number;
  createdAt: string;
}

interface BankAccount {
  id: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName: string;
  holderName: string;
  accountType: string;
  isVerified: boolean;
  createdAt: string;
}

interface Declaration {
  id: string;
  termsVersion: string;
  acceptedAt: string;
  ipAddress: string | null;
}

interface Selfie {
  id: string;
  photoUrl: string;
  adminStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectReason: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
}

interface ApplicationData {
  id: string;
  userId: string;
  stage: ApplicationStage;
  createdAt: string;
  updatedAt: string;
  kycDetails?: KycDetails | null;
  eligibilityCheck?: EligibilityCheck | null;
  loanTerms?: LoanTerms | null;
  bankAccount?: BankAccount | null;
  declaration?: Declaration | null;
  selfie?: Selfie | null;
}

const getMediaUrl = (url: string | null | undefined) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const backendBase = process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '')
    : 'http://localhost:5000';
  return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

export function CustomerDashboard({
  onNavigateToStage,
}: {
  onNavigateToStage?: (stage: ApplicationStage) => void;
}) {
  const { user, application: authApp, updateApplicationStage, refreshSession } = useAuth();
  const router = useRouter();

  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  // Collapsible section state
  const [expandedSections, setExpandedSections] = useState<{
    terms: boolean;
    kyc: boolean;
    financial: boolean;
    bank: boolean;
    declaration: boolean;
    selfie: boolean;
  }>({
    terms: true,
    kyc: true,
    financial: true,
    bank: true,
    declaration: true,
    selfie: true,
  });

  const toggleSection = (key: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchApplicationDetails = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const res = await apiClient.get<{
        user: any;
        application: ApplicationData | null;
      }>('/auth/my-application');

      if (res.data?.application) {
        setApplication(res.data.application);
        if (authApp?.stage !== res.data.application.stage) {
          updateApplicationStage(res.data.application.stage);
        }
      } else {
        // Fallback to /auth/me
        const meRes = await apiClient.get<{
          user: any;
          application: ApplicationData | null;
        }>('/auth/me');

        if (meRes.data?.application) {
          setApplication(meRes.data.application);
          if (authApp?.stage !== meRes.data.application.stage) {
            updateApplicationStage(meRes.data.application.stage);
          }
        } else {
          setApplication(null);
        }
      }
    } catch (err: any) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Failed to load application status. Please try refreshing.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [authApp?.stage, updateApplicationStage]);

  const handleRefreshAndReload = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      await refreshSession();
      await fetchApplicationDetails(false);
    } catch {
      setError('Session expired. Please sign in again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchApplicationDetails();
  }, [fetchApplicationDetails]);

  // Auto-poll status every 12 seconds when waiting for admin review or approval
  useEffect(() => {
    if (
      application?.stage === 'WAITING_ADMIN_REVIEW' ||
      application?.stage === 'APPROVED'
    ) {
      const interval = setInterval(() => {
        fetchApplicationDetails(true);
      }, 12000);
      return () => clearInterval(interval);
    }
  }, [application?.stage, fetchApplicationDetails]);

  const handleCopyAppId = () => {
    if (!application?.id) return;
    navigator.clipboard.writeText(application.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const currentStage: ApplicationStage = application?.stage || authApp?.stage || 'WAITING_ADMIN_REVIEW';

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-96 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-40 w-full rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error && !application) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <div className="rounded-3xl border border-rose-200 bg-rose-50/90 p-8 shadow-fintech dark:border-rose-900/40 dark:bg-rose-950/30">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-900/40">
            <AlertCircle className="h-7 w-7 text-rose-600 dark:text-rose-400" />
          </div>
          <h2 className="mt-4 text-xl font-black text-slate-900 dark:text-white">
            Application Status Notification
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            {error.includes('expired') || error.includes('401')
              ? 'Your active session needs refresh. Please click below to refresh and load your application dossier.'
              : error}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={handleRefreshAndReload}
              disabled={isRefreshing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-md cursor-pointer"
            >
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Dashboard'}
            </Button>
            <Button
              onClick={() => router.push('/apply')}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md cursor-pointer"
            >
              <span>Continue Application</span>
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/login')}
              className="text-xs font-bold px-5 py-2.5 rounded-xl border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              Sign In Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Empty State (No application record found)
  if (!application) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-glass dark:border-slate-800 dark:bg-slate-900">
          <Sparkles className="mx-auto h-12 w-12 text-emerald-600" />
          <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
            No Active Loan Application
          </h2>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
            You do not have an active loan application yet. Start your journey in under 3 minutes with instant automated underwriting.
          </p>
          <Link href="/apply">
            <Button className="mt-6 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-glow">
              Apply for Personal Loan
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const {
    kycDetails,
    eligibilityCheck,
    loanTerms,
    bankAccount,
    declaration,
    selfie,
  } = application;

  const maskIdNumber = (val: string, type: string) => {
    if (!val) return '••••';
    if (type === 'PAN') {
      return `${val.slice(0, 5)}••••${val.slice(-1)}`;
    }
    if (type === 'AADHAAR') {
      return `•••• •••• ${val.slice(-4)}`;
    }
    return `••••${val.slice(-4)}`;
  };

  const maskAccount = (val: string) => {
    if (!val) return '••••';
    return `•••• •••• ${val.slice(-4)}`;
  };

  const formatCurrency = (val: number | string | null | undefined, maxDecimals = 0) => {
    if (val === null || val === undefined || isNaN(Number(val))) return '0';
    return Number(val).toLocaleString('en-IN', {
      maximumFractionDigits: maxDecimals,
      minimumFractionDigits: maxDecimals > 0 ? maxDecimals : 0,
    });
  };

  const formatPercent = (val: number | string | null | undefined, maxDecimals = 2) => {
    if (val === null || val === undefined || isNaN(Number(val))) return '0';
    return Number(val).toLocaleString('en-IN', {
      maximumFractionDigits: maxDecimals,
    });
  };

  const formatDate = (val: string | Date | null | undefined) => {
    if (!val) return '—';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  const formatDateTime = (val: string | Date | null | undefined) => {
    if (!val) return '—';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  return (
    <div className="relative overflow-hidden min-h-screen">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-80 w-[600px] rounded-full bg-emerald-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute top-96 right-0 h-64 w-64 rounded-full bg-teal-500/10 blur-[80px]" />

      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 pb-16">
        {/* 1. Header & Quick Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-4 w-4" />
              <span>BORROWER STATUS DASHBOARD</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Loan Application Overview
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span>Reference ID:</span>
            <button
              onClick={handleCopyAppId}
              aria-label="Copy Application Reference ID"
              className="inline-flex items-center space-x-1 rounded bg-slate-100 px-2 py-0.5 font-mono font-bold text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              title="Click to copy Application ID"
            >
              <span>{application.id}</span>
              {copiedId ? (
                <Check className="h-3 w-3 text-emerald-600" />
              ) : (
                <Copy className="h-3 w-3 text-slate-400" />
              )}
            </button>
            <span aria-hidden="true">•</span>
            <span>Applicant: <strong>{kycDetails?.fullName || user?.email || 'Valued Customer'}</strong></span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchApplicationDetails(true)}
            disabled={isRefreshing}
            className="text-xs font-bold"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Status'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.print()}
            className="hidden sm:inline-flex text-xs font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Print Summary
          </Button>
        </div>
      </div>

      {/* 2. Hero Dynamic Stage Outcome Card */}
      {currentStage === 'WAITING_ADMIN_REVIEW' && (
        <Card className="border-amber-300 bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-white dark:border-amber-700/50 dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-950 shadow-glass overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md">
                  <Clock className="h-6 w-6 animate-pulse" />
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500" />
                  </span>
                </div>
                <div>
                  <Badge className="bg-amber-500 text-white font-bold text-[10px] uppercase tracking-wider mb-1">
                    Underwriting Review in Progress
                  </Badge>
                  <CardTitle className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    Verification Selfie & Application Submitted
                  </CardTitle>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-100 px-3.5 py-1.5 text-right dark:border-amber-900/40 dark:bg-amber-950/40">
                <p className="text-[10px] font-bold uppercase text-amber-900 dark:text-amber-300">
                  Estimated Review Time
                </p>
                <p className="text-xs font-black text-amber-950 dark:text-amber-200">
                  ~ 10 to 15 Minutes
                </p>
              </div>
            </div>
            <CardDescription className="text-xs text-slate-700 dark:text-slate-300 mt-2 font-medium">
              Our automated risk engine and administrative underwriter are currently reviewing your biometric identity snapshot, KYC records, and repayment capacity.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-0 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="flex items-start space-x-2.5 rounded-xl border border-amber-200/60 bg-white p-3 dark:border-slate-800 dark:bg-slate-850 shadow-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">1. Data Submitted</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">All 7 onboarding steps completed</p>
                </div>
              </div>

              <div className="flex items-start space-x-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30 shadow-xs">
                <Clock className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5 animate-spin" />
                <div>
                  <p className="font-bold text-amber-950 dark:text-amber-200">2. Admin Review</p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">Underwriter actively evaluating</p>
                </div>
              </div>

              <div className="flex items-start space-x-2.5 rounded-xl border border-slate-200 bg-white/60 p-3 opacity-60 dark:border-slate-800 dark:bg-slate-850">
                <Landmark className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-700 dark:text-slate-300">3. Direct Disbursement</p>
                  <p className="text-[11px] text-slate-500">Instant electronic credit to bank</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-amber-500/10 px-3.5 py-2 text-[11px] text-amber-900 dark:text-amber-200 font-medium">
              <span>💡 This page will automatically update once the underwriter completes the review.</span>
              <span className="font-mono text-[10px] text-amber-800 dark:text-amber-300 font-bold">Live Auto-poll: Active</span>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStage === 'APPROVED' && (
        <Card className="border-emerald-300 bg-gradient-to-br from-emerald-500/15 via-emerald-50/60 to-white dark:border-emerald-700/60 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-950 shadow-glass overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-glow">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <Badge className="bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider mb-1">
                    Application Sanctioned & Approved
                  </Badge>
                  <CardTitle className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    Congratulations! Your Loan Has Been Approved
                  </CardTitle>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-300 bg-emerald-100 px-4 py-2 text-right dark:border-emerald-900/40 dark:bg-emerald-950/50">
                <p className="text-[10px] font-bold uppercase text-emerald-900 dark:text-emerald-300">
                  Sanctioned Principal
                </p>
                <p className="text-lg font-black text-emerald-950 dark:text-emerald-200">
                  ₹{formatCurrency(loanTerms?.amount)}
                </p>
              </div>
            </div>
            <CardDescription className="text-xs text-slate-700 dark:text-slate-300 mt-2 font-medium">
              All identity checks, credit assessment, and biometric verifications have passed successfully. Your disbursement is in the final processing queue.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-0 text-xs">
            <div className="rounded-2xl border border-emerald-200 bg-white p-4 dark:border-emerald-900/40 dark:bg-slate-850 space-y-3 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                <div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Net Disbursement Credited To</p>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {bankAccount?.bankName || 'Verified Bank'} (A/C: {maskAccount(bankAccount?.accountNumber || '')})
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Net Amount</p>
                  <p className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                    ₹{formatCurrency(loanTerms?.netDisbursement)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium">
                <Sparkles className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                <span>Our treasury department is initiating the electronic NEFT/IMPS transfer. You will receive an SMS confirmation once credited.</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStage === 'DISBURSED' && (
        <Card className="border-emerald-500/50 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white shadow-xl overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950 font-black shadow-glow">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <Badge className="bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider mb-1">
                    ACTIVE LOAN ACCOUNT
                  </Badge>
                  <CardTitle className="text-lg sm:text-xl font-black text-white">
                    Loan Disbursed Successfully!
                  </CardTitle>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/70 px-4 py-2 text-right">
                <p className="text-[10px] font-bold uppercase text-emerald-400">
                  Total Disbursed
                </p>
                <p className="text-lg font-black text-emerald-300">
                  ₹{formatCurrency(loanTerms?.netDisbursement || loanTerms?.amount)}
                </p>
              </div>
            </div>
            <CardDescription className="text-xs text-slate-300 mt-2">
              Funds have been transferred to your validated bank account. Your monthly repayment schedule is now active.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-0 text-xs text-slate-300">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="rounded-xl border border-slate-800 bg-slate-800/60 p-3">
                <p className="text-[10px] text-slate-400">Monthly EMI</p>
                <p className="text-sm font-black text-white">
                  ₹{formatCurrency(loanTerms?.emi, 2)}
                </p>
                <p className="text-[10px] text-emerald-400 font-semibold">Due on 5th each mo</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-800/60 p-3">
                <p className="text-[10px] text-slate-400">Tenure</p>
                <p className="text-sm font-black text-white">
                  {loanTerms?.tenureMonths || 0} Months
                </p>
                <p className="text-[10px] text-slate-300">Fixed Rate: {formatPercent(loanTerms?.interestRate)}%</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-800/60 p-3">
                <p className="text-[10px] text-slate-400">Linked Account</p>
                <p className="text-xs font-bold text-white truncate">
                  {bankAccount?.bankName || 'HDFC Bank'}
                </p>
                <p className="text-[10px] text-slate-400">{maskAccount(bankAccount?.accountNumber || '')}</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-800/60 p-3">
                <p className="text-[10px] text-slate-400">Repayment Mode</p>
                <p className="text-xs font-bold text-emerald-400">
                  NACH / e-Mandate
                </p>
                <p className="text-[10px] text-slate-400">Autopay Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStage === 'REJECTED' && (
        <Card className="border-rose-300 bg-gradient-to-br from-rose-500/10 via-rose-50/50 to-white dark:border-rose-900/60 dark:from-rose-950/30 dark:via-slate-900 dark:to-slate-950 shadow-glass overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-md">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <Badge variant="destructive" className="font-bold text-[10px] uppercase tracking-wider mb-1">
                  Application Ineligible / Declined
                </Badge>
                <CardTitle className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  Application Could Not Be Approved
                </CardTitle>
              </div>
            </div>
            <CardDescription className="text-xs text-slate-700 dark:text-slate-300 mt-2 font-medium">
              We regret to inform you that your application does not meet our current automated underwriting or identity verification criteria.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-0 text-xs">
            {selfie?.rejectReason && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/40 dark:bg-rose-950/40">
                <p className="font-bold text-rose-900 dark:text-rose-200">
                  Reason for Decision:
                </p>
                <p className="mt-1 text-slate-800 dark:text-slate-200 font-medium">
                  {selfie.rejectReason}
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-850 space-y-2">
              <p className="font-bold text-slate-800 dark:text-slate-200">
                What are your next steps?
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                <li>You can re-apply after 30 days if your financial profile or income changes.</li>
                <li>Ensure all identity documents and uploaded selfies have clear lighting and matching details.</li>
                <li>Reach out to our customer credit assistance desk if you believe this was an error.</li>
              </ul>
              <div className="pt-2 flex flex-wrap gap-2">
                <Link href="/">
                  <Button variant="outline" size="sm" className="text-xs font-semibold">
                    Return to Home
                  </Button>
                </Link>
                <a href="mailto:support@ezfinanz.com">
                  <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-xs dark:bg-slate-800 dark:hover:bg-slate-700 font-semibold">
                    Contact Support Desk
                  </Button>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* In-Progress Alert Banner if user navigates to dashboard before completing */}
      {currentStage !== 'WAITING_ADMIN_REVIEW' &&
        currentStage !== 'APPROVED' &&
        currentStage !== 'DISBURSED' &&
        currentStage !== 'REJECTED' && (
          <div className="rounded-2xl border border-teal-200 bg-teal-50/90 p-4 dark:border-teal-900/40 dark:bg-teal-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Sparkles className="h-5 w-5 text-teal-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-teal-950 dark:text-teal-200">
                  Application In Progress ({currentStage})
                </p>
                <p className="text-[11px] text-teal-800 dark:text-teal-300 font-medium">
                  Please complete the remaining onboarding steps to submit your application for review.
                </p>
              </div>
            </div>
            <Link href="/apply">
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm whitespace-nowrap">
                Resume Application
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        )}

      {/* 3. Reusable 8-Step Stepper Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
            <Layers className="h-4 w-4 text-emerald-600" />
            <span>Onboarding Stage Progress</span>
          </h2>
          <span className="text-xs font-mono text-emerald-600 font-bold">
            {currentStage}
          </span>
        </div>
        <LoanStepper currentStage={currentStage} />
      </div>

      {/* 4. Structured Read-Only 6-Module Application Summary */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Application Submission Summary
          </h2>
          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Read-only verified records
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Loan Terms & EMI Calculation */}
          <Card className="border-slate-200/80 shadow-glass">
            <CardHeader
              role="button"
              tabIndex={0}
              aria-expanded={expandedSections.terms}
              aria-controls="section-terms-content"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleSection('terms');
                }
              }}
              className="cursor-pointer pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-t-2xl"
              onClick={() => toggleSection('terms')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
                  <Percent className="h-5 w-5" />
                  <CardTitle className="text-sm font-bold">
                    Loan Terms & EMI Calculation
                  </CardTitle>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 font-bold">
                    {loanTerms ? 'Confirmed' : 'Pending'}
                  </Badge>
                  {expandedSections.terms ? (
                    <ChevronUp className="h-4 w-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  )}
                </div>
              </div>
            </CardHeader>

            {expandedSections.terms && (
              <CardContent id="section-terms-content" className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 pt-0">
                {loanTerms ? (
                  <>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Sanctioned Principal:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        ₹{formatCurrency(loanTerms.amount)}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Selected Tenure:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {loanTerms.tenureMonths || 0} Months
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Interest Rate:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatPercent(loanTerms.interestRate)}% p.a.
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Monthly EMI:</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        ₹{formatCurrency(loanTerms.emi, 2)}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Total Deductions (Fee + GST):</span>
                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                        - ₹{formatCurrency(loanTerms.totalDeductions)}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/70 dark:bg-emerald-950/30 px-2 rounded-lg">
                      <span className="font-bold text-slate-800 dark:text-slate-200">Net Disbursement:</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400">
                        ₹{formatCurrency(loanTerms.netDisbursement)}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Total Repayment:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        ₹{formatCurrency(loanTerms.totalRepayment, 2)}
                      </span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-slate-500 dark:text-slate-400">Effective IRR / APR:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatPercent(loanTerms.irr)}%
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-slate-400 italic py-2">Loan terms have not been confirmed yet.</p>
                )}
              </CardContent>
            )}
          </Card>

          {/* Card 2: Identity & KYC Details */}
          <Card className="border-slate-200/80 shadow-glass">
            <CardHeader
              role="button"
              tabIndex={0}
              aria-expanded={expandedSections.kyc}
              aria-controls="section-kyc-content"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleSection('kyc');
                }
              }}
              className="cursor-pointer pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-t-2xl"
              onClick={() => toggleSection('kyc')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-teal-600 dark:text-teal-400">
                  <User className="h-5 w-5" />
                  <CardTitle className="text-sm font-bold">
                    Identity & KYC Details
                  </CardTitle>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-[10px] text-teal-700 bg-teal-50 dark:bg-teal-950/50 dark:text-teal-300 border-teal-300 font-bold">
                    {kycDetails ? 'Verified' : 'Pending'}
                  </Badge>
                  {expandedSections.kyc ? (
                    <ChevronUp className="h-4 w-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  )}
                </div>
              </div>
            </CardHeader>

            {expandedSections.kyc && (
              <CardContent id="section-kyc-content" className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 pt-0">
                {kycDetails ? (
                  <>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Full Legal Name:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {kycDetails.fullName}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">ID Document Type:</span>
                      <Badge variant="secondary" className="text-[10px] font-bold">
                        {kycDetails.idType}
                      </Badge>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">ID Document Number:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {maskIdNumber(kycDetails.idNumber, kycDetails.idType)}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Date of Birth & Gender:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {formatDate(kycDetails.dob)} • {kycDetails.gender}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Address:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 text-right max-w-[240px] truncate">
                        {kycDetails.address}
                      </span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-slate-500 dark:text-slate-400">Document Upload:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Document ID Verified</span>
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-slate-400 italic py-2">KYC information pending submission.</p>
                )}
              </CardContent>
            )}
          </Card>

          {/* Card 3: Financial & Underwriting Profile */}
          <Card className="border-slate-200/80 shadow-glass">
            <CardHeader
              role="button"
              tabIndex={0}
              aria-expanded={expandedSections.financial}
              aria-controls="section-financial-content"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleSection('financial');
                }
              }}
              className="cursor-pointer pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-t-2xl"
              onClick={() => toggleSection('financial')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
                  <TrendingUp className="h-5 w-5" />
                  <CardTitle className="text-sm font-bold">
                    Financial & Underwriting Profile
                  </CardTitle>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-[10px] text-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-300 font-bold">
                    {eligibilityCheck ? 'Evaluated' : 'Pending'}
                  </Badge>
                  {expandedSections.financial ? (
                    <ChevronUp className="h-4 w-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  )}
                </div>
              </div>
            </CardHeader>

            {expandedSections.financial && (
              <CardContent id="section-financial-content" className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 pt-0">
                {eligibilityCheck ? (
                  <>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Monthly Net Income:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        ₹{formatCurrency(eligibilityCheck.income)}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Employer & Role:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-right max-w-[240px] truncate">
                        {eligibilityCheck.employerName} ({eligibilityCheck.designation})
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Existing Monthly Debts:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        ₹{formatCurrency(eligibilityCheck.existingDebts)}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Simulated CIBIL Score:</span>
                      <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                        {eligibilityCheck.creditScore || 780} (EXCELLENT)
                      </Badge>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Debt-to-Income (DTI):</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatPercent(eligibilityCheck.dtiRatio || 25, 0)}% (Optimal &lt; 50%)
                      </span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-slate-500 dark:text-slate-400">Max Sanction Limit:</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        ₹{formatCurrency(eligibilityCheck.maxEligibleAmount || 500000)}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-slate-400 italic py-2">Underwriting evaluation pending.</p>
                )}
              </CardContent>
            )}
          </Card>

          {/* Card 4: Linked Bank Account */}
          <Card className="border-slate-200/80 shadow-glass">
            <CardHeader
              role="button"
              tabIndex={0}
              aria-expanded={expandedSections.bank}
              aria-controls="section-bank-content"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleSection('bank');
                }
              }}
              className="cursor-pointer pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-t-2xl"
              onClick={() => toggleSection('bank')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-cyan-600 dark:text-cyan-400">
                  <Landmark className="h-5 w-5" />
                  <CardTitle className="text-sm font-bold">
                    Disbursement Bank Account
                  </CardTitle>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-[10px] text-cyan-700 bg-cyan-50 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-300 font-bold">
                    {bankAccount ? 'Linked' : 'Pending'}
                  </Badge>
                  {expandedSections.bank ? (
                    <ChevronUp className="h-4 w-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  )}
                </div>
              </div>
            </CardHeader>

            {expandedSections.bank && (
              <CardContent id="section-bank-content" className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 pt-0">
                {bankAccount ? (
                  <>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Bank Name & Branch:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {bankAccount.bankName} - {bankAccount.branchName || 'Main Branch'}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Account Number:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {maskAccount(bankAccount.accountNumber)}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">IFSC Code:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {bankAccount.ifscCode}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Beneficiary Name:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {bankAccount.holderName}
                      </span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-slate-500 dark:text-slate-400">Account Type & Verification:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Savings A/C (Penny Drop Verified)</span>
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-slate-400 italic py-2">Bank account linking pending.</p>
                )}
              </CardContent>
            )}
          </Card>

          {/* Card 5: Statutory Undertaking & Legal Consent */}
          <Card className="border-slate-200/80 shadow-glass">
            <CardHeader
              role="button"
              tabIndex={0}
              aria-expanded={expandedSections.declaration}
              aria-controls="section-declaration-content"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleSection('declaration');
                }
              }}
              className="cursor-pointer pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-t-2xl"
              onClick={() => toggleSection('declaration')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                  <FileText className="h-5 w-5" />
                  <CardTitle className="text-sm font-bold">
                    Statutory Undertaking & E-Consent
                  </CardTitle>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-[10px] text-blue-700 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-300 border-blue-300 font-bold">
                    {declaration ? 'E-Signed' : 'Pending'}
                  </Badge>
                  {expandedSections.declaration ? (
                    <ChevronUp className="h-4 w-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  )}
                </div>
              </div>
            </CardHeader>

            {expandedSections.declaration && (
              <CardContent id="section-declaration-content" className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 pt-0">
                {declaration ? (
                  <>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Statutory Version:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {declaration.termsVersion || 'v1.0'}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Legal Standard:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Information Technology Act, 2000
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">E-Signature Timestamp:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {formatDateTime(declaration.acceptedAt)}
                      </span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-slate-500 dark:text-slate-400">Audit Status:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Legally Binding Electronic Consent</span>
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-slate-400 italic py-2">Declaration consent pending confirmation.</p>
                )}
              </CardContent>
            )}
          </Card>

          {/* Card 6: Biometric Selfie Verification */}
          <Card className="border-slate-200/80 shadow-glass">
            <CardHeader
              role="button"
              tabIndex={0}
              aria-expanded={expandedSections.selfie}
              aria-controls="section-selfie-content"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleSection('selfie');
                }
              }}
              className="cursor-pointer pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-t-2xl"
              onClick={() => toggleSection('selfie')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400">
                  <Camera className="h-5 w-5" />
                  <CardTitle className="text-sm font-bold">
                    Biometric Identity Verification
                  </CardTitle>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={selfie?.adminStatus === 'APPROVED' ? 'default' : 'outline'}
                    className={`text-[10px] font-bold ${
                      selfie?.adminStatus === 'APPROVED'
                        ? 'bg-emerald-600 text-white'
                        : selfie?.adminStatus === 'REJECTED'
                        ? 'text-rose-700 bg-rose-50 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300'
                        : 'text-amber-700 bg-amber-50 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300'
                    }`}
                  >
                    {selfie ? selfie.adminStatus : 'Pending'}
                  </Badge>
                  {expandedSections.selfie ? (
                    <ChevronUp className="h-4 w-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  )}
                </div>
              </div>
            </CardHeader>

            {expandedSections.selfie && (
              <CardContent id="section-selfie-content" className="space-y-3 text-xs text-slate-700 dark:text-slate-300 pt-0">
                {selfie ? (
                  <div className="flex items-start space-x-4 pt-1">
                    {selfie.photoUrl && (
                      <div className="relative h-20 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 border-emerald-500 shadow-sm bg-slate-100 dark:bg-slate-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getMediaUrl(selfie.photoUrl)}
                          alt="Biometric Selfie"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="space-y-1 text-xs">
                      <p className="font-bold text-slate-900 dark:text-white">
                        Facial Liveness Verified
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Uploaded on: {formatDateTime(selfie.createdAt)}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Status:{' '}
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {selfie.adminStatus}
                        </span>
                      </p>
                      {selfie.reviewedAt && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                          Reviewed on: {formatDateTime(selfie.reviewedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 italic py-2">Selfie verification pending.</p>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  </div>
  );
}
