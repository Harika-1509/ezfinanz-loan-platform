'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  User,
  CheckCircle2,
  AlertCircle,
  Clock,
  Landmark,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Percent,
  Camera,
  CheckCircle,
  XCircle,
  RefreshCw,
  Send,
  Building2,
  CreditCard,
  Lock,
  ArrowRight,
  Receipt,
  FileCheck,
  AlertTriangle,
  ZoomIn,
} from 'lucide-react';
import { apiClient, ApiError } from '../../lib/api-client';
import { ApplicationStage } from '../../contexts/auth-context';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';

export interface ApplicationDetailData {
  application: {
    id: string;
    userId: string;
    stage: ApplicationStage;
    createdAt: string;
    updatedAt: string;
  };
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    role: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    createdAt: string;
  };
  kycDetails: {
    id: string;
    fullName: string;
    dob: string;
    gender: string;
    address: string;
    idType: string;
    idNumber: string;
    idPhotoUrl: string | null;
    createdAt: string;
  } | null;
  eligibilityCheck: {
    id: string;
    income: number;
    requestedAmount: number;
    creditScore: number;
    existingDebts: number;
    employerName: string;
    designation: string;
    dtiRatio: number;
    result: string;
    maxApprovedAmount: number;
    createdAt: string;
  } | null;
  loanTerms: {
    id: string;
    amount: number;
    tenureMonths: number;
    interestRate: number;
    processingFee: number;
    gst: number;
    otherCharges: number;
    emi: number;
    totalInterest: number;
    totalRepayment: number;
    totalCharges: number;
    netDisbursement: number;
    irr: number;
    createdAt: string;
  } | null;
  bankAccount: {
    id: string;
    holderName: string;
    accountNumber: string;
    ifsc: string;
    bankName: string;
    branchName?: string;
    createdAt: string;
  } | null;
  declaration: {
    id: string;
    accepted: boolean;
    acceptedAt: string;
    termsVersion: string;
    ipAddress: string | null;
    createdAt: string;
  } | null;
  selfie: {
    id: string;
    photoUrl: string;
    adminStatus: string;
    rejectReason: string | null;
    reviewedBy: string | null;
    reviewedAt: string | null;
    createdAt: string;
  } | null;
}

export interface DisbursementReceipt {
  applicationId: string;
  stage: ApplicationStage;
  referenceId: string;
  disbursedAmount: number;
  nominalAmount: number;
  tenureMonths: number;
  monthlyEmi: number;
  beneficiaryAccount: {
    holderName: string;
    accountNumber: string;
    ifsc: string;
    bankName: string;
  } | null;
  disbursedAt: string;
  processedBy: string;
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

export function AdminApplicationDetail({
  applicationId,
}: {
  applicationId: string;
}) {
  const router = useRouter();

  const [data, setData] = useState<ApplicationDetailData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Modal / Action states
  const [isApprovingSelfie, setIsApprovingSelfie] = useState<boolean>(false);
  const [isRejectingSelfie, setIsRejectingSelfie] = useState<boolean>(false);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  const [isDisbursing, setIsDisbursing] = useState<boolean>(false);
  const [disburseRefId, setDisburseRefId] = useState<string>('');
  const [disburseNotes, setDisburseNotes] = useState<string>('');
  const [disbursementReceipt, setDisbursementReceipt] = useState<DisbursementReceipt | null>(null);

  const [isPhotoZoomed, setIsPhotoZoomed] = useState<boolean>(false);

  const fetchDetail = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setIsLoading(true);
      else setIsRefreshing(true);
      setError(null);

      try {
        const res = await apiClient.get<ApplicationDetailData>(
          `/admin/applications/${applicationId}`
        );
        if (res.data) {
          setData(res.data);
        }
      } catch (err: any) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Failed to load application details. Please verify the ID.'
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [applicationId]
  );

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleApproveSelfie = async () => {
    setIsApprovingSelfie(true);
    setError(null);
    try {
      await apiClient.post(`/admin/applications/${applicationId}/selfie/approve`, {});
      setActionSuccessMessage('✓ Biometric Selfie and application approved successfully!');
      setTimeout(() => setActionSuccessMessage(null), 5000);
      await fetchDetail(true);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Failed to approve selfie.');
    } finally {
      setIsApprovingSelfie(false);
    }
  };

  const handleRejectSelfie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      setRejectError('Please enter a specific reason for rejection.');
      return;
    }

    setIsRejectingSelfie(true);
    setRejectError(null);
    try {
      await apiClient.post(`/admin/applications/${applicationId}/selfie/reject`, {
        reason: rejectReason.trim(),
      });
      setShowRejectModal(false);
      setRejectReason('');
      setActionSuccessMessage('Application marked as REJECTED with feedback notice sent to borrower.');
      setTimeout(() => setActionSuccessMessage(null), 5000);
      await fetchDetail(true);
    } catch (err: any) {
      setRejectError(err instanceof ApiError ? err.message : 'Failed to reject selfie.');
    } finally {
      setIsRejectingSelfie(false);
    }
  };

  const handleDisburseLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDisbursing(true);
    setError(null);

    try {
      const res = await apiClient.post<any>(
        `/admin/applications/${applicationId}/disburse`,
        {
          referenceId: disburseRefId.trim() || undefined,
          notes: disburseNotes.trim() || undefined,
        }
      );

      if (res.data) {
        setDisbursementReceipt(res.data.receipt || res.data);
      }
      setActionSuccessMessage('⚡ Loan successfully disbursed to borrower account!');
      await fetchDetail(true);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Failed to disburse loan.');
    } finally {
      setIsDisbursing(false);
    }
  };

  const formatCurrency = (val: number | null | undefined, maxDecimals = 0) => {
    if (val === null || val === undefined || isNaN(Number(val))) return '₹0';
    return `₹${Number(val).toLocaleString('en-IN', {
      maximumFractionDigits: maxDecimals,
      minimumFractionDigits: maxDecimals > 0 ? maxDecimals : 0,
    })}`;
  };

  const formatPercent = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(Number(val))) return '0';
    return Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-IN', {
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

  const maskAccount = (acc: string) => {
    if (!acc) return '••••';
    return acc.length > 4 ? `••••••••${acc.slice(-4)}` : acc;
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-10 w-80 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-44 w-full rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-72 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-72 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-3xl border border-rose-200 bg-rose-50/80 p-8 dark:border-rose-900/40 dark:bg-rose-950/20 space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-600" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Application File Not Found
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">{error}</p>
          <div className="pt-2 flex justify-center space-x-3">
            <Link href="/admin">
              <Button variant="outline" size="sm" className="text-xs">
                Back to Registry
              </Button>
            </Link>
            <Button size="sm" onClick={() => fetchDetail()} className="text-xs bg-rose-600 hover:bg-rose-700 text-white">
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Retry Load
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const {
    application,
    user,
    kycDetails,
    eligibilityCheck,
    loanTerms,
    bankAccount,
    declaration,
    selfie,
  } = data;

  const isSelfieApproved = selfie?.adminStatus === 'APPROVED';
  const isSelfiePending = selfie?.adminStatus === 'PENDING' || application.stage === 'WAITING_ADMIN_REVIEW';
  const isApprovedForDisbursement = application.stage === 'APPROVED';
  const isDisbursed = application.stage === 'DISBURSED';
  const isRejected = application.stage === 'REJECTED';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Top Breadcrumb Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="space-y-1">
          <Link
            href="/admin"
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-emerald-600 transition-colors"
          >
            <ChevronLeft className="mr-1 h-3.5 w-3.5" />
            Back to Application Registry
          </Link>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {kycDetails?.fullName || user.email || 'Applicant Dossier'}
            </h1>
            <Badge className="font-mono text-[10px] bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
              APP ID: {application.id.substring(0, 13)}...
            </Badge>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Stage indicator badge */}
          {application.stage === 'WAITING_ADMIN_REVIEW' && (
            <Badge className="bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 font-bold text-xs uppercase tracking-wider animate-pulse py-1 px-3">
              <Clock className="mr-1.5 h-3.5 w-3.5 inline" />
              Waiting Underwriter Review
            </Badge>
          )}
          {application.stage === 'APPROVED' && (
            <Badge className="bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider py-1 px-3">
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 inline text-emerald-600" />
              Approved for Disbursement
            </Badge>
          )}
          {application.stage === 'DISBURSED' && (
            <Badge className="bg-slate-900 text-emerald-400 border border-emerald-500/30 dark:bg-slate-800 font-extrabold text-xs uppercase tracking-wider shadow-sm py-1 px-3">
              <Sparkles className="mr-1.5 h-3.5 w-3.5 inline text-emerald-400" />
              Disbursed Loan Account
            </Badge>
          )}
          {application.stage === 'REJECTED' && (
            <Badge variant="destructive" className="font-bold text-xs uppercase tracking-wider py-1 px-3">
              <AlertCircle className="mr-1.5 h-3.5 w-3.5 inline" />
              Application Rejected
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDetail(true)}
            disabled={isRefreshing}
            className="text-xs h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Global Action Success Notification */}
      {actionSuccessMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30 flex items-center space-x-3 text-xs font-semibold text-emerald-900 dark:text-emerald-200 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Hero Decisioning Header: Quick Stats & Underwriter Actions */}
      <Card className="border-slate-200/80 shadow-glass overflow-hidden dark:border-slate-800">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="border-r border-slate-100 pr-4 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase text-slate-400">Sanctioned Amount</p>
                <p className="text-lg font-black text-slate-900 dark:text-white">
                  {formatCurrency(loanTerms?.amount || eligibilityCheck?.requestedAmount)}
                </p>
                <p className="text-[10px] text-emerald-600 font-semibold">
                  Net: {formatCurrency(loanTerms?.netDisbursement)}
                </p>
              </div>

              <div className="border-r border-slate-100 pr-4 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase text-slate-400">Monthly EMI</p>
                <p className="text-lg font-black text-slate-900 dark:text-white">
                  {formatCurrency(loanTerms?.emi, 2)}
                </p>
                <p className="text-[10px] text-slate-500">{loanTerms?.tenureMonths || 0} Months Tenure</p>
              </div>

              <div className="border-r border-slate-100 pr-4 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase text-slate-400">CIBIL Score</p>
                <p className="text-lg font-black text-emerald-600">
                  {eligibilityCheck?.creditScore || 780}
                </p>
                <p className="text-[10px] text-slate-500">DTI: {eligibilityCheck?.dtiRatio || 25}%</p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Biometric Verification</p>
                <p className={`text-base font-bold ${
                  isSelfieApproved
                    ? 'text-emerald-600'
                    : isRejected
                    ? 'text-rose-600'
                    : 'text-amber-600'
                }`}>
                  {selfie?.adminStatus || 'Pending'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {selfie?.reviewedAt ? `Reviewed ${formatDate(selfie.reviewedAt)}` : 'Awaiting action'}
                </p>
              </div>
            </div>

            {/* Quick Action Buttons for Underwriter */}
            <div className="flex flex-wrap items-center gap-3">
              {isSelfiePending && (
                <>
                  <Button
                    size="sm"
                    onClick={() => setShowRejectModal(true)}
                    disabled={isRejectingSelfie}
                    variant="outline"
                    className="border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold dark:border-rose-900/60 dark:text-rose-300"
                  >
                    <XCircle className="mr-1.5 h-4 w-4 text-rose-600" />
                    Reject Application
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleApproveSelfie}
                    disabled={isApprovingSelfie}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md"
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    {isApprovingSelfie ? 'Approving...' : 'Approve Application'}
                  </Button>
                </>
              )}

              {isApprovedForDisbursement && (
                <a href="#disbursement-action">
                  <Button
                    size="sm"
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black dark:bg-emerald-600 dark:hover:bg-emerald-700 shadow-glow"
                  >
                    <Landmark className="mr-1.5 h-4 w-4 text-emerald-400" />
                    Execute Loan Disbursement
                  </Button>
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 8-Step Vertical Timeline */}
      <div className="space-y-6">
        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-emerald-600" />
          <span>Complete 8-Step Customer Onboarding Dossier</span>
        </h2>

        <div className="space-y-4">
          {/* STEP 1: Account Registration & Verification */}
          <Card className="border-slate-200/80 shadow-glass dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold text-xs">
                    1
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                    Borrower Account & Security Verification
                  </CardTitle>
                </div>
                <Badge className="bg-emerald-100 text-emerald-900 border-emerald-200 text-[10px]">
                  Verified Account
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-slate-600 dark:text-slate-300">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Email Address</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{user.email || '—'}</span>
                  <span className="text-[10px] text-emerald-600 block">
                    {user.emailVerified ? '✓ Email 2FA Verified' : 'OTP Verified'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Mobile Phone</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{user.phone || '—'}</span>
                  <span className="text-[10px] text-emerald-600 block">
                    {user.phoneVerified ? '✓ Phone SMS Verified' : 'Standard Verified'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Registration Timestamp</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatDate(user.createdAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* STEP 2: KYC Details & Identity Document */}
          <Card className="border-slate-200/80 shadow-glass dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold text-xs">
                    2
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                    Legal KYC & Document Validation
                  </CardTitle>
                </div>
                <Badge variant="outline" className="text-[10px] text-teal-600 border-teal-200">
                  {kycDetails ? 'KYC Submitted' : 'Pending'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 text-xs">
              {kycDetails ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-slate-600 dark:text-slate-300">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Full Legal Name</span>
                    <span className="font-bold text-slate-900 dark:text-white">{kycDetails.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">ID Document</span>
                    <Badge variant="secondary" className="text-[10px] font-bold mt-0.5">
                      {kycDetails.idType}: {kycDetails.idNumber}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">DOB & Gender</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {formatDate(kycDetails.dob)} • {kycDetails.gender}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Residential Address</span>
                    <span className="font-medium text-slate-900 dark:text-white truncate block">
                      {kycDetails.address}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 italic">KYC submission pending.</p>
              )}
            </CardContent>
          </Card>

          {/* STEP 3: Financial & Underwriting Profile */}
          <Card className="border-slate-200/80 shadow-glass dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold text-xs">
                    3
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                    Automated Credit Assessment & Underwriting
                  </CardTitle>
                </div>
                <Badge variant="outline" className="text-[10px] text-indigo-600 border-indigo-200">
                  {eligibilityCheck?.result || 'Evaluated'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 text-xs">
              {eligibilityCheck ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-slate-600 dark:text-slate-300">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Monthly Net Income</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(eligibilityCheck.income)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Existing Monthly Debts</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(eligibilityCheck.existingDebts)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Employer & Role</span>
                    <span className="font-semibold text-slate-900 dark:text-white truncate block">
                      {eligibilityCheck.employerName} ({eligibilityCheck.designation})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Max Approved Cap</span>
                    <span className="font-bold text-indigo-600">
                      {formatCurrency(eligibilityCheck.maxApprovedAmount || 500000)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 italic">Underwriting assessment pending.</p>
              )}
            </CardContent>
          </Card>

          {/* STEP 4: Loan Terms & Repayment Structure */}
          <Card className="border-slate-200/80 shadow-glass dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold text-xs">
                    4
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                    Confirmed Loan Terms & Mathematical Schedule
                  </CardTitle>
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200">
                  {loanTerms ? 'Terms Locked' : 'Pending'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 text-xs">
              {loanTerms ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-slate-600 dark:text-slate-300">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Principal Sanctioned</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(loanTerms.amount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Interest Rate & Tenure</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatPercent(loanTerms.interestRate)}% p.a. ({loanTerms.tenureMonths}M)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Monthly Equated EMI</span>
                    <span className="font-extrabold text-emerald-600">{formatCurrency(loanTerms.emi, 2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Net Disbursement Amount</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(loanTerms.netDisbursement)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 italic">Loan calculation pending.</p>
              )}
            </CardContent>
          </Card>

          {/* STEP 5: Linked Disbursement Bank Account */}
          <Card className="border-slate-200/80 shadow-glass dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold text-xs">
                    5
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                    Validated Beneficiary Bank Account
                  </CardTitle>
                </div>
                <Badge variant="outline" className="text-[10px] text-cyan-600 border-cyan-200">
                  {bankAccount ? 'Penny Drop Verified' : 'Pending'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 text-xs">
              {bankAccount ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-slate-600 dark:text-slate-300">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Bank Name & Branch</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {bankAccount.bankName} - {bankAccount.branchName || 'Main Branch'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Account & IFSC Code</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {bankAccount.accountNumber} ({bankAccount.ifsc})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Account Holder Name</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{bankAccount.holderName}</span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 italic">Bank account linking pending.</p>
              )}
            </CardContent>
          </Card>

          {/* STEP 6: Statutory Undertaking & Legal Consent */}
          <Card className="border-slate-200/80 shadow-glass dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold text-xs">
                    6
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                    Statutory Undertaking & E-Signature
                  </CardTitle>
                </div>
                <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200">
                  {declaration ? 'E-Signed (IT Act 2000)' : 'Pending'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 text-xs">
              {declaration ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-slate-600 dark:text-slate-300">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Terms Version</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      {declaration.termsVersion || 'v1.0'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">E-Signature Timestamp</span>
                    <span className="font-mono text-slate-900 dark:text-white">
                      {formatDate(declaration.acceptedAt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Signee IP Address</span>
                    <span className="font-mono text-slate-900 dark:text-white">
                      {declaration.ipAddress || '127.0.0.1 (Local Verified)'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 italic">Declaration acceptance pending.</p>
              )}
            </CardContent>
          </Card>

          {/* STEP 7: Biometric Selfie Verification (PROMINENT DECISIONING CARD) */}
          <Card className="border-purple-300/80 bg-gradient-to-br from-purple-500/5 via-white to-white shadow-xl dark:border-purple-900/60 dark:from-purple-950/20 dark:via-slate-900 dark:to-slate-900 overflow-hidden">
            <CardHeader className="pb-3 border-b border-purple-100 dark:border-purple-950/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-600 text-white font-bold text-xs shadow-md">
                    7
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      Biometric Liveness & Facial Verification
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Mandatory underwriter visual verification against identity documents
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  className={`text-[10px] font-bold ${
                    isSelfieApproved
                      ? 'bg-emerald-600 text-white'
                      : isRejected
                      ? 'bg-rose-600 text-white'
                      : 'bg-amber-500 text-white animate-pulse'
                  }`}
                >
                  {selfie ? selfie.adminStatus : 'Pending Submission'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-5 space-y-6">
              {selfie ? (
                <div className="flex flex-col md:flex-row items-start gap-6">
                  {/* Selfie Image Viewer with Zoom */}
                  <div className="relative group flex-shrink-0">
                    <div className="relative h-48 w-40 overflow-hidden rounded-2xl border-2 border-purple-400/80 shadow-lg bg-slate-100 dark:bg-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getMediaUrl(selfie.photoUrl)}
                        alt="Live Biometric Capture"
                        className="h-full w-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                        onClick={() => setIsPhotoZoomed(true)}
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPhotoZoomed(true)}
                      className="absolute bottom-2 right-2 rounded-lg bg-slate-900/80 p-1.5 text-white backdrop-blur-sm opacity-90 hover:opacity-100 text-[10px] flex items-center space-x-1"
                    >
                      <ZoomIn className="h-3 w-3" />
                      <span>Zoom</span>
                    </button>
                  </div>

                  {/* Metadata & Actions */}
                  <div className="space-y-4 flex-1">
                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <p>
                        <span className="text-slate-400 font-bold uppercase text-[10px] mr-2">Captured At:</span>
                        <span className="font-mono font-semibold">{formatDate(selfie.createdAt)}</span>
                      </p>
                      <p>
                        <span className="text-slate-400 font-bold uppercase text-[10px] mr-2">Review Status:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{selfie.adminStatus}</span>
                      </p>
                      {selfie.reviewedAt && (
                        <p>
                          <span className="text-slate-400 font-bold uppercase text-[10px] mr-2">Reviewed At:</span>
                          <span className="font-mono">{formatDate(selfie.reviewedAt)}</span>
                        </p>
                      )}
                      {selfie.rejectReason && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200 mt-2">
                          <p className="font-bold text-xs">Rejection Justification:</p>
                          <p className="text-xs mt-0.5">{selfie.rejectReason}</p>
                        </div>
                      )}
                    </div>

                    {/* Underwriter Action Buttons */}
                    {isSelfiePending && (
                      <div className="pt-2 flex flex-wrap items-center gap-3 border-t border-slate-100 dark:border-slate-800">
                        <Button
                          onClick={handleApproveSelfie}
                          disabled={isApprovingSelfie}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md"
                        >
                          <CheckCircle2 className="mr-1.5 h-4 w-4" />
                          {isApprovingSelfie ? 'Confirming Approval...' : 'Approve Biometric Identity'}
                        </Button>

                        <Button
                          onClick={() => setShowRejectModal(true)}
                          disabled={isRejectingSelfie}
                          variant="outline"
                          className="border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold dark:border-rose-900/60 dark:text-rose-300"
                        >
                          <XCircle className="mr-1.5 h-4 w-4 text-rose-600" />
                          Decline / Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-400 italic">
                  Borrower has not uploaded a biometric selfie yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* STEP 8: Final Disbursement & Loan Execution (ID: disbursement-action) */}
          <div id="disbursement-action">
            <Card className="border-slate-200/80 shadow-glass dark:border-slate-800 overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-emerald-400 dark:bg-slate-800 font-black text-xs">
                      8
                    </div>
                    <div>
                      <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        Treasury NEFT / IMPS Electronic Disbursement
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Final automated credit execution to borrower bank account
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={`text-[10px] font-bold ${
                    isDisbursed
                      ? 'bg-slate-900 text-emerald-400 dark:bg-slate-800'
                      : isApprovedForDisbursement
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {isDisbursed ? 'DISBURSED' : isApprovedForDisbursement ? 'READY' : 'LOCKED'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-4 text-xs space-y-4">
                {isDisbursed ? (
                  <div className="rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 p-5 dark:border-emerald-900/60 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 space-y-4">
                    <div className="flex items-center space-x-3 text-emerald-800 dark:text-emerald-300">
                      <Sparkles className="h-6 w-6 text-emerald-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-black">Loan Funds Successfully Disbursed</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          Transfer executed to {bankAccount?.bankName} (A/C: {maskAccount(bankAccount?.accountNumber || '')})
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-slate-700 dark:text-slate-300 border-t border-emerald-200 dark:border-emerald-900/40">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500">Net Credit</span>
                        <p className="text-base font-black text-emerald-600">
                          {formatCurrency(loanTerms?.netDisbursement || loanTerms?.amount)}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500">Tenure</span>
                        <p className="font-bold">{loanTerms?.tenureMonths || 0} Months</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500">Monthly EMI</span>
                        <p className="font-bold">{formatCurrency(loanTerms?.emi, 2)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500">Repayment Status</span>
                        <p className="font-bold text-emerald-600">Active Schedule</p>
                      </div>
                    </div>
                  </div>
                ) : isApprovedForDisbursement ? (
                  <form onSubmit={handleDisburseLoan} className="space-y-4">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20 space-y-2">
                      <p className="font-bold text-slate-900 dark:text-white">
                        Application is Approved and Ready for Disbursement
                      </p>
                      <p className="text-slate-600 dark:text-slate-300">
                        Net Amount of <span className="font-extrabold text-emerald-600">{formatCurrency(loanTerms?.netDisbursement)}</span> will be credited to {bankAccount?.bankName} (A/C: {maskAccount(bankAccount?.accountNumber || '')}, IFSC: {bankAccount?.ifsc}).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Treasury Transaction Reference ID (Optional)
                        </label>
                        <Input
                          type="text"
                          placeholder="e.g. TXN_NEFT_889212001"
                          value={disburseRefId}
                          onChange={(e) => setDisburseRefId(e.target.value)}
                          className="text-xs h-9 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Disbursement Notes (Optional)
                        </label>
                        <Input
                          type="text"
                          placeholder="e.g. Cleared via treasury desk batch #12"
                          value={disburseNotes}
                          onChange={(e) => setDisburseNotes(e.target.value)}
                          className="text-xs h-9"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isDisbursing}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black dark:bg-emerald-600 dark:hover:bg-emerald-700 shadow-md"
                    >
                      <Landmark className="mr-2 h-4 w-4 text-emerald-400" />
                      {isDisbursing ? 'Executing Bank Transfer...' : 'Confirm & Disburse Funds'}
                    </Button>
                  </form>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-850 text-slate-500 space-y-1">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      Disbursement Control Locked
                    </p>
                    <p className="text-[11px]">
                      Loan disbursement can only be executed after the borrower’s biometric selfie is formally reviewed and approved by an underwriter.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Reject Application Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl dark:border-rose-900/60 dark:bg-slate-900 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Decline / Reject Application
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Please provide a clear justification for rejecting this loan application. This feedback will be recorded in the audit log and displayed to the applicant.
            </p>

            <form onSubmit={handleRejectSelfie} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Decision <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Selfie photo is blurred / details do not match submitted identity documents."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                {rejectError && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1">
                    {rejectError}
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectError(null);
                  }}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isRejectingSelfie}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                >
                  {isRejectingSelfie ? 'Declining...' : 'Confirm Rejection'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Zoom Modal */}
      {isPhotoZoomed && selfie?.photoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 cursor-pointer"
          onClick={() => setIsPhotoZoomed(false)}
        >
          <div className="relative max-h-[85vh] max-w-lg overflow-hidden rounded-3xl border-2 border-purple-500 shadow-2xl bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getMediaUrl(selfie.photoUrl)}
              alt="High-Res Biometric Liveness Capture"
              className="max-h-[80vh] w-auto object-contain"
            />
            <div className="p-3 text-center text-xs text-white/80 bg-slate-900/90">
              Click anywhere to close full preview
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
