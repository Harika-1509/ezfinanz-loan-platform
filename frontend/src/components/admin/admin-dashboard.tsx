'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  Landmark,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Banknote,
  Users,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { apiClient, ApiError } from '../../lib/api-client';
import { ApplicationStage } from '../../contexts/auth-context';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';

export interface AdminApplicationSummary {
  id: string;
  userId: string;
  applicantName: string;
  applicantEmail: string | null;
  applicantPhone: string | null;
  requestedAmount: number;
  tenureMonths: number | null;
  stage: ApplicationStage;
  selfieStatus: string | null;
  submittedAt: string;
  updatedAt: string;
}

export interface AdminStats {
  totalApplications: number;
  waitingReview: number;
  approved: number;
  disbursed: number;
  rejected: number;
  inProgress: number;
  totalDisbursedAmount: number;
}

export function AdminDashboard() {
  const router = useRouter();

  const [applications, setApplications] = useState<AdminApplicationSummary[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & Pagination State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiClient.get<AdminStats>('/admin/stats');
      if (res.data) {
        setStats(res.data);
      }
    } catch {
      // Non-critical, fallback gracefully
    }
  }, []);

  const fetchApplications = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setIsLoading(true);
      else setIsRefreshing(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams();
        queryParams.append('page', String(page));
        queryParams.append('limit', String(limit));
        if (searchQuery.trim()) {
          queryParams.append('search', searchQuery.trim());
        }
        if (selectedStage !== 'ALL') {
          queryParams.append('stage', selectedStage);
        }

        const res = await apiClient.get<{
          applications: AdminApplicationSummary[];
          pagination: {
            page: number;
            limit: number;
            totalCount: number;
            totalPages: number;
          };
        }>(`/admin/applications?${queryParams.toString()}`);

        if (res.data) {
          setApplications(res.data.applications || []);
          setTotalPages(res.data.pagination?.totalPages || 1);
          setTotalCount(res.data.pagination?.totalCount ?? (res.data.pagination as any)?.total ?? 0);
        }
      } catch (err: any) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Failed to load applications. Please check admin permissions.'
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, limit, searchQuery, selectedStage]
  );

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchApplications();
  };

  const handleStageChange = (newStage: string) => {
    setSelectedStage(newStage);
    setPage(1);
  };

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(Number(val))) return '₹0';
    return `₹${Number(val).toLocaleString('en-IN')}`;
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

  const getStageBadge = (stage: ApplicationStage) => {
    switch (stage) {
      case 'WAITING_ADMIN_REVIEW':
        return (
          <Badge className="bg-amber-100 text-amber-950 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 font-bold text-[10px] uppercase tracking-wider animate-pulse">
            <Clock className="mr-1 h-3 w-3 inline" />
            Under Review
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge className="bg-emerald-100 text-emerald-950 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 font-bold text-[10px] uppercase tracking-wider">
            <CheckCircle2 className="mr-1 h-3 w-3 inline text-emerald-600 dark:text-emerald-400" />
            Approved
          </Badge>
        );
      case 'DISBURSED':
        return (
          <Badge className="bg-slate-900 text-emerald-400 border border-emerald-500/40 dark:bg-slate-800 font-black text-[10px] uppercase tracking-wider shadow-sm">
            <Sparkles className="mr-1 h-3 w-3 inline text-emerald-400" />
            Disbursed
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="destructive" className="font-bold text-[10px] uppercase tracking-wider">
            <AlertCircle className="mr-1 h-3 w-3 inline" />
            Declined
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
            {stage ? stage.replace(/_/g, ' ') : 'Draft'}
          </Badge>
        );
    }
  };

  const getSelfieBadge = (selfieStatus: string | null) => {
    if (!selfieStatus) {
      return <span className="text-[11px] text-slate-500 italic">Pending</span>;
    }
    if (selfieStatus === 'APPROVED') {
      return (
        <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
          <CheckCircle className="mr-1 h-3.5 w-3.5" />
          Verified
        </span>
      );
    }
    if (selfieStatus === 'REJECTED') {
      return (
        <span className="inline-flex items-center text-[11px] font-bold text-rose-700 dark:text-rose-400">
          <XCircle className="mr-1 h-3.5 w-3.5" />
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-[11px] font-bold text-amber-700 dark:text-amber-400">
        <Clock className="mr-1 h-3.5 w-3.5" />
        Needs Review
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Underwriting Operations Portal
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
            Real-time loan application assessment, biometric selfie decisioning, and treasury disbursement management.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchStats();
              fetchApplications(true);
            }}
            disabled={isRefreshing}
            className="text-xs font-bold"
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Records'}
          </Button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Apps */}
        <Card className="border-slate-200/80 shadow-glass dark:border-slate-800">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Total Portfolio</span>
              <Users className="h-4 w-4 text-slate-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {stats ? stats.totalApplications : '—'}
            </p>
            <p className="text-[10px] text-slate-500 font-medium">Lifetime user applications</p>
          </CardContent>
        </Card>

        {/* Needs Review */}
        <Card className="border-amber-200/80 bg-amber-50/40 shadow-glass dark:border-amber-900/40 dark:bg-amber-950/20">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-amber-800 dark:text-amber-400">
              <span className="text-xs font-bold uppercase tracking-wider">Action Required</span>
              <Clock className="h-4 w-4 text-amber-600 animate-spin" />
            </div>
            <p className="text-2xl font-black text-amber-950 dark:text-amber-200">
              {stats ? stats.waitingReview : '—'}
            </p>
            <p className="text-[10px] text-amber-800 dark:text-amber-300 font-medium">Waiting Selfie & KYC Review</p>
          </CardContent>
        </Card>

        {/* Approved */}
        <Card className="border-emerald-200/80 bg-emerald-50/40 shadow-glass dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-400">
              <span className="text-xs font-bold uppercase tracking-wider">Approved Queue</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-950 dark:text-emerald-200">
              {stats ? stats.approved : '—'}
            </p>
            <p className="text-[10px] text-emerald-800 dark:text-emerald-300 font-medium">Ready for disbursement</p>
          </CardContent>
        </Card>

        {/* Disbursed */}
        <Card className="border-cyan-200/80 bg-cyan-50/40 shadow-glass dark:border-cyan-900/40 dark:bg-cyan-950/20">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-cyan-800 dark:text-cyan-400">
              <span className="text-xs font-bold uppercase tracking-wider">Active Loans</span>
              <Landmark className="h-4 w-4 text-cyan-600" />
            </div>
            <p className="text-2xl font-black text-cyan-950 dark:text-cyan-200">
              {stats ? stats.disbursed : '—'}
            </p>
            <p className="text-[10px] text-cyan-800 dark:text-cyan-300 font-medium">Successfully disbursed</p>
          </CardContent>
        </Card>

        {/* Disbursed Volume */}
        <Card className="border-slate-800 bg-slate-900 text-white shadow-xl dark:border-slate-700 col-span-2 lg:col-span-1">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-xs font-bold uppercase tracking-wider">Disbursed Volume</span>
              <Banknote className="h-4 w-4" />
            </div>
            <p className="text-xl font-black text-white truncate">
              {stats ? formatCurrency(stats.totalDisbursedAmount) : '—'}
            </p>
            <p className="text-[10px] text-slate-400 font-medium">Total credited funds</p>
          </CardContent>
        </Card>
      </div>

      {/* Control Bar: Search & Stage Filters */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Stage Tabs */}
          <div
            role="tablist"
            aria-label="Filter applications by stage"
            className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs"
          >
            {[
              { id: 'ALL', label: 'All Applications' },
              { id: 'WAITING_ADMIN_REVIEW', label: '⏳ Waiting Review' },
              { id: 'APPROVED', label: '✓ Approved' },
              { id: 'DISBURSED', label: '⚡ Disbursed' },
              { id: 'REJECTED', label: '✕ Rejected' },
              { id: 'IN_PROGRESS', label: 'Drafts' },
            ].map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={selectedStage === tab.id}
                onClick={() => handleStageChange(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                  selectedStage === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2 w-full md:w-80">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search applicant, email, phone..."
                aria-label="Search applications by applicant name, email, or phone number"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
            <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9">
              Filter
            </Button>
          </form>
        </div>
      </div>

      {/* Main Applications Table */}
      <Card className="border-slate-200/80 shadow-glass overflow-hidden dark:border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
              Application Master Registry
            </CardTitle>
            <CardDescription className="text-xs text-slate-600 dark:text-slate-400">
              Showing {applications.length} of {totalCount} matching loan files
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-mono font-medium">
              Page {page} of {totalPages}
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Loading State */}
          {isLoading && (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-850">
                  <div className="space-y-2">
                    <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                  </div>
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
                  <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div role="alert" className="p-12 text-center space-y-3">
              <AlertCircle className="mx-auto h-10 w-10 text-rose-500" />
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Unable to Retrieve Application Data
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">{error}</p>
              <Button size="sm" onClick={() => fetchApplications()} className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white">
                Retry Query
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && applications.length === 0 && (
            <div className="p-16 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500">
                <FileText className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                No Applications Match Your Criteria
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                No loan records were found with current filter options. Try clearing search keywords or selecting all stages.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStage('ALL');
                }}
                className="text-xs font-semibold"
              >
                Reset Filters
              </Button>
            </div>
          )}

          {/* Success Data Table */}
          {!isLoading && !error && applications.length > 0 && (
            <div className="overflow-x-auto">
              <table aria-label="Loan applications master table" className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400">
                    <th scope="col" className="py-3.5 px-4">Applicant</th>
                    <th scope="col" className="py-3.5 px-4">Loan Details</th>
                    <th scope="col" className="py-3.5 px-4">Workflow Stage</th>
                    <th scope="col" className="py-3.5 px-4">Biometric Selfie</th>
                    <th scope="col" className="py-3.5 px-4">Submission Date</th>
                    <th scope="col" className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {applications.map((app) => (
                    <tr
                      key={app.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-colors"
                    >
                      {/* 1. Applicant Column */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 dark:text-white text-xs">
                            {app.applicantName || 'Applicant Profile'}
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                            {app.applicantEmail || app.applicantPhone || 'Verified Borrower'}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">
                            ID: {app.id.substring(0, 8)}...
                          </p>
                        </div>
                      </td>

                      {/* 2. Loan Details Column */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-mono font-black text-slate-900 dark:text-white text-xs">
                            {formatCurrency(app.requestedAmount)}
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                            {app.tenureMonths ? `${app.tenureMonths} Months Tenure` : 'Tenure Pending'}
                          </p>
                        </div>
                      </td>

                      {/* 3. Stage Column */}
                      <td className="py-3.5 px-4">{getStageBadge(app.stage)}</td>

                      {/* 4. Selfie Status */}
                      <td className="py-3.5 px-4">{getSelfieBadge(app.selfieStatus)}</td>

                      {/* 5. Date */}
                      <td className="py-3.5 px-4 text-[11px] text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                        {formatDate(app.submittedAt || app.updatedAt)}
                      </td>

                      {/* 6. Action Column */}
                      <td className="py-3.5 px-4 text-right">
                        <Link href={`/admin/applications/${app.id}`}>
                          <Button
                            size="sm"
                            className="bg-slate-900 hover:bg-slate-800 text-white text-xs dark:bg-emerald-600 dark:hover:bg-emerald-700 font-bold focus-visible:ring-2 focus-visible:ring-emerald-600"
                          >
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            Review File
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* Table Footer with Pagination */}
        {!isLoading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 text-xs">
            <p className="text-slate-600 dark:text-slate-400 font-medium">
              Showing page <span className="font-bold text-slate-900 dark:text-white">{page}</span> of{' '}
              <span className="font-bold text-slate-900 dark:text-white">{totalPages}</span>
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                aria-label="Previous page"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="text-xs h-8 font-semibold"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                aria-label="Next page"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="text-xs h-8 font-semibold"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
