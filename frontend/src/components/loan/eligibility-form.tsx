'use client';

import React, { useState, useEffect } from 'react';
import {
  Calculator,
  TrendingUp,
  Building2,
  Briefcase,
  IndianRupee,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Sparkles,
  Info,
  RefreshCw,
  Percent,
  XCircle,
  Edit3,
} from 'lucide-react';
import { eligibilitySchema, extractFieldErrors } from '../../lib/validation';
import { useAuth } from '../../contexts/auth-context';
import { apiClient } from '../../lib/api-client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';

export interface EligibilityResult {
  decision: 'ELIGIBLE' | 'PARTIALLY_ELIGIBLE' | 'NOT_ELIGIBLE';
  creditScore: number;
  creditBand: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  dtiRatio: number;
  maxEligibleAmount: number;
  interestRate: number;
  reasons?: string[];
}

export interface EligibilityFormProps {
  onSuccess?: (result: EligibilityResult) => void;
}

export function EligibilityForm({ onSuccess }: EligibilityFormProps) {
  const { updateApplicationStage } = useAuth();

  // Form State
  const [monthlyIncome, setMonthlyIncome] = useState<string>('75000');
  const [requestedAmount, setRequestedAmount] = useState<string>('300000');
  const [existingDebts, setExistingDebts] = useState<string>('10000');
  const [employerName, setEmployerName] = useState<string>('Tata Consultancy Services');
  const [designation, setDesignation] = useState<string>('Senior Software Engineer');

  // Evaluation Result State
  const [result, setResult] = useState<EligibilityResult | null>(null);

  // UI State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetchingStatus, setIsFetchingStatus] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Check if eligibility assessment was already completed
  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await apiClient.get<any>('/eligibility/status');
        const check = res.data?.eligibilityCheck;
        const calc = res.data?.calculation;
        if (check && check.result) {
          const score = check.creditScore || calc?.creditScore || 750;
          const band: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' =
            calc?.creditScoreBand || (score >= 750 ? 'EXCELLENT' : score >= 650 ? 'GOOD' : score >= 600 ? 'FAIR' : 'POOR');

          setResult({
            decision: check.result,
            creditScore: Number(score),
            creditBand: band,
            dtiRatio: Number(check.dtiRatio || calc?.dtiRatio || 0),
            maxEligibleAmount: Number(check.maxApprovedAmount || 0),
            interestRate: Number(score) >= 750 ? 12.5 : Number(score) >= 650 ? 14.5 : 16.5,
            reasons: calc?.reasons || [],
          });
        }
      } catch {
        // Not yet evaluated or draft
      } finally {
        setIsFetchingStatus(false);
      }
    }
    loadStatus();
  }, []);

  const handleQuickAmount = (amt: number) => {
    setRequestedAmount(amt.toString());
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    const incomeNum = Number(monthlyIncome);
    const amountNum = Number(requestedAmount);
    const debtsNum = Number(existingDebts || 0);

    const validation = eligibilitySchema.safeParse({
      income: incomeNum,
      requestedAmount: amountNum,
      existingDebts: debtsNum,
      employerName,
      designation,
    });

    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          const pathKey = err.path[0].toString();
          errors[pathKey] = err.message;
          if (pathKey === 'income') errors['monthlyIncome'] = err.message;
        }
      });
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.post<any>('/eligibility/check', {
        income: incomeNum,
        requestedAmount: amountNum,
        existingDebts: debtsNum,
        employerName,
        designation,
      });

      const data = res.data;
      const calc = data?.calculation;
      const check = data?.eligibilityCheck;

      const decision = calc?.result || check?.result || 'ELIGIBLE';
      const creditScore = check?.creditScore || calc?.creditScore || 785;
      const creditBand = calc?.creditScoreBand || (creditScore >= 750 ? 'EXCELLENT' : creditScore >= 650 ? 'GOOD' : 'FAIR');
      const dtiRatio = calc?.dtiRatio ?? check?.dtiRatio ?? 25;
      const maxEligibleAmount = calc?.maxApprovedAmount ?? check?.maxApprovedAmount ?? amountNum;
      const interestRate = creditScore >= 750 ? 12.5 : creditScore >= 650 ? 14.5 : 16.5;

      const evalData: EligibilityResult = {
        decision,
        creditScore,
        creditBand,
        dtiRatio,
        maxEligibleAmount,
        interestRate,
        reasons: calc?.reasons || [],
      };

      setResult(evalData);
      updateApplicationStage('ELIGIBILITY_CHECKED');
    } catch (err) {
      const { fieldErrors: extractedFieldErrors, generalMessage } = extractFieldErrors(
        err,
        'Failed to compute loan eligibility. Please verify your inputs.'
      );
      setErrorMessage(generalMessage);
      if (Object.keys(extractedFieldErrors).length > 0) {
        if (extractedFieldErrors.income && !extractedFieldErrors.monthlyIncome) {
          extractedFieldErrors.monthlyIncome = extractedFieldErrors.income;
        }
        setFieldErrors(extractedFieldErrors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (isFetchingStatus) {
    return (
      <Card className="border-slate-200/80 shadow-fintech">
        <CardContent className="flex flex-col items-center justify-center py-16 space-y-3">
          <Loader2 className="h-9 w-9 animate-spin text-emerald-600" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Initializing digital underwriting engine...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200/80 shadow-fintech backdrop-blur-xl dark:border-slate-800/80">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3 text-emerald-600">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 shadow-xs">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-white">
                Step 3: Credit & Underwriting Assessment
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Automated debt-to-income and bureau credit score evaluation.
              </CardDescription>
            </div>
          </div>
          {result && (
            <Badge
              variant={
                result.decision === 'ELIGIBLE'
                  ? 'success'
                  : result.decision === 'PARTIALLY_ELIGIBLE'
                  ? 'warning'
                  : 'destructive'
              }
              dot
              className="text-xs px-3.5 py-1 font-bold"
            >
              {result.decision.replace('_', ' ')}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Error Alert */}
        {errorMessage && (
          <div role="alert" className="flex items-start space-x-2.5 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200 font-medium animate-in fade-in-50">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1 font-bold">{errorMessage}</div>
          </div>
        )}

        {/* Bureau Note */}
        <div className="flex items-start space-x-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-xs text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          <Info className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Real-time Credit Score Simulation</p>
            <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
              Score is pulled from the simulated credit bureau benchmark (Score ≥ 750 with DTI ≤ 50% grants instant prime terms).
            </p>
          </div>
        </div>

        {/* If result is NOT yet calculated, show Form */}
        {!result ? (
          <form onSubmit={handleEvaluate} className="space-y-5">
            {/* Income & Amount */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="monthlyIncome" required className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Monthly Net Take-Home Salary (₹)
                </Label>
                <Input
                  id="monthlyIncome"
                  type="number"
                  placeholder="75000"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  error={Boolean(fieldErrors.monthlyIncome)}
                  disabled={isLoading}
                  className="font-medium"
                />
                {fieldErrors.monthlyIncome && (
                  <p className="text-xs font-semibold text-rose-600">{fieldErrors.monthlyIncome}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="requestedAmount" required className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Desired Loan Amount (₹10k - ₹5L)
                </Label>
                <Input
                  id="requestedAmount"
                  type="number"
                  placeholder="200000"
                  value={requestedAmount}
                  onChange={(e) => setRequestedAmount(e.target.value)}
                  error={Boolean(fieldErrors.requestedAmount)}
                  disabled={isLoading}
                  className="font-medium"
                />
                {fieldErrors.requestedAmount && (
                  <p className="text-xs font-semibold text-rose-600">{fieldErrors.requestedAmount}</p>
                )}
              </div>
            </div>

            {/* Quick Amount Selector Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1" role="group" aria-label="Quick Select Loan Amount">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">Presets:</span>
              {[50000, 100000, 250000, 500000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickAmount(amt)}
                  aria-pressed={requestedAmount === amt.toString()}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer ${
                    requestedAmount === amt.toString()
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  {amt < 100000 ? `₹${amt / 1000}k` : `₹${amt / 100000} Lakh`}
                </button>
              ))}
            </div>

            {/* Existing Debts */}
            <div className="space-y-1.5">
              <Label htmlFor="existingDebts" required className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Total Existing Monthly Loan EMIs / Credit Card Obligations (₹)
              </Label>
              <Input
                id="existingDebts"
                type="number"
                placeholder="10000"
                value={existingDebts}
                onChange={(e) => setExistingDebts(e.target.value)}
                error={Boolean(fieldErrors.existingDebts)}
                disabled={isLoading}
                className="font-medium"
              />
              {fieldErrors.existingDebts ? (
                <p className="text-xs font-semibold text-rose-600">{fieldErrors.existingDebts}</p>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Enter ₹0 if you currently have no other active monthly debt obligations.
                </p>
              )}
            </div>

            {/* Employer & Designation */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="employerName" required className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Current Employer Name
                </Label>
                <Input
                  id="employerName"
                  type="text"
                  placeholder="e.g. Tata Consultancy Services"
                  value={employerName}
                  onChange={(e) => setEmployerName(e.target.value)}
                  error={Boolean(fieldErrors.employerName)}
                  disabled={isLoading}
                />
                {fieldErrors.employerName && (
                  <p className="text-xs font-semibold text-rose-600">{fieldErrors.employerName}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="designation" required className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Job Designation / Role
                </Label>
                <Input
                  id="designation"
                  type="text"
                  placeholder="e.g. Senior Software Engineer"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  error={Boolean(fieldErrors.designation)}
                  disabled={isLoading}
                />
                {fieldErrors.designation && (
                  <p className="text-xs font-semibold text-rose-600">{fieldErrors.designation}</p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 shadow-md shadow-emerald-950/10 mt-4 rounded-xl"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Evaluating Financial Profile...
                </>
              ) : (
                <>
                  Assess Loan Eligibility
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        ) : (
          /* Result Outcome Display */
          <div className="space-y-5" aria-live="polite">
            {/* Outcome 1: ELIGIBLE */}
            {result.decision === 'ELIGIBLE' && (
              <div className="rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-6 text-slate-900 dark:border-emerald-800 dark:text-white space-y-4 shadow-fintech">
                <div className="flex items-center space-x-3.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-emerald-glow shrink-0">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-emerald-950 dark:text-emerald-300">
                      Congratulations! You are Eligible
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Your financial profile qualifies for prime personal loan terms.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-900/60">
                  <div className="rounded-xl bg-white/95 p-3.5 dark:bg-slate-900/90 border border-emerald-100 dark:border-emerald-950 shadow-xs">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Max Sanction</p>
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatCurrency(result.maxEligibleAmount)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/95 p-3.5 dark:bg-slate-900/90 border border-emerald-100 dark:border-emerald-950 shadow-xs">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">CIBIL Score</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                      {result.creditScore}{' '}
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        ({result.creditBand})
                      </span>
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/95 p-3.5 dark:bg-slate-900/90 border border-emerald-100 dark:border-emerald-950 shadow-xs">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">DTI Ratio</p>
                    <p className="text-lg font-black text-teal-600 dark:text-teal-400 tabular-nums">
                      {Number(result.dtiRatio || 0).toFixed(1)}%
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/95 p-3.5 dark:bg-slate-900/90 border border-emerald-100 dark:border-emerald-950 shadow-xs">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Prime Rate</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                      {result.interestRate}% p.a.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <Button
                    onClick={() => {
                      if (onSuccess) onSuccess(result);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 px-6 shadow-md shadow-emerald-950/10 flex-1 sm:flex-none rounded-xl"
                  >
                    Proceed to Loan Terms & EMI Selection
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setResult(null)}
                    className="text-xs font-bold h-12 rounded-xl"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Re-calculate
                  </Button>
                </div>
              </div>
            )}

            {/* Outcome 2: PARTIALLY_ELIGIBLE */}
            {result.decision === 'PARTIALLY_ELIGIBLE' && (
              <div className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-6 text-slate-900 dark:border-amber-800 dark:text-white space-y-4 shadow-fintech">
                <div className="flex items-center space-x-3.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shrink-0">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-amber-950 dark:text-amber-300">
                      Partially Eligible
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      We can approve an adjusted loan amount based on your existing monthly obligations.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-amber-200/60 dark:border-amber-900/60">
                  <div className="rounded-xl bg-white/95 p-3.5 dark:bg-slate-900/90 border border-amber-100 dark:border-amber-950 shadow-xs">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Approved Limit</p>
                    <p className="text-lg font-black text-amber-600 dark:text-amber-400 tabular-nums">
                      {formatCurrency(result.maxEligibleAmount)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/95 p-3.5 dark:bg-slate-900/90 border border-amber-100 dark:border-amber-950 shadow-xs">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">CIBIL Score</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                      {result.creditScore}{' '}
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        ({result.creditBand})
                      </span>
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/95 p-3.5 dark:bg-slate-900/90 border border-amber-100 dark:border-amber-950 shadow-xs">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">DTI Ratio</p>
                    <p className="text-lg font-black text-slate-800 dark:text-slate-200 tabular-nums">
                      {Number(result.dtiRatio || 0).toFixed(1)}%
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/95 p-3.5 dark:bg-slate-900/90 border border-amber-100 dark:border-amber-950 shadow-xs">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Interest Rate</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                      {result.interestRate}% p.a.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <Button
                    onClick={() => {
                      if (onSuccess) onSuccess(result);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-12 px-6 shadow-md flex-1 sm:flex-none rounded-xl"
                  >
                    Proceed with Adjusted Limit (₹{(result.maxEligibleAmount / 100000).toFixed(1)}L)
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setResult(null)}
                    className="text-xs font-bold h-12 rounded-xl"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Modify Details
                  </Button>
                </div>
              </div>
            )}

            {/* Outcome 3: NOT_ELIGIBLE (Clear Specific Rejection Reasons & Non-Dead-End Recovery) */}
            {result.decision === 'NOT_ELIGIBLE' && (
              <div className="rounded-2xl border-2 border-rose-300 bg-rose-50/60 p-6 text-slate-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-white space-y-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 shrink-0 shadow-xs">
                    <XCircle className="h-7 w-7 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 dark:bg-rose-900 dark:text-rose-200">
                        UNDERWRITING OUTCOME: REJECTED
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-rose-950 dark:text-rose-100">
                      Loan Eligibility Assessment: Not Approved
                    </h3>
                    <p className="text-xs text-rose-800/90 dark:text-rose-300/90 font-medium">
                      Based on our automated risk & credit policy parameters, this application does not meet the minimum criteria for the requested amount at this time.
                    </p>
                  </div>
                </div>

                {/* Specific Rejection Reasons Box */}
                <div className="rounded-xl border border-rose-200 bg-white p-4.5 dark:border-rose-900/80 dark:bg-slate-950 space-y-3 shadow-xs">
                  <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      Specific Reason(s) for Rejection:
                    </h4>
                  </div>
                  <ul className="space-y-2">
                    {result.reasons && result.reasons.length > 0 ? (
                      result.reasons.map((reason, idx) => (
                        <li
                          key={idx}
                          className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-200 font-medium"
                        >
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-700 dark:bg-rose-900 dark:text-rose-300 mt-0.5">
                            ✕
                          </span>
                          <span className="leading-relaxed">{reason}</span>
                        </li>
                      ))
                    ) : (
                      <li className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-200 font-medium">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-700 dark:bg-rose-900 dark:text-rose-300 mt-0.5">
                          ✕
                        </span>
                        <span className="leading-relaxed">
                          Financial risk metrics and debt obligations exceed permissible underwriting benchmarks.
                        </span>
                      </li>
                    )}
                  </ul>
                </div>

                {/* Assessment Parameters Snapshot */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-white/90 p-3 dark:bg-slate-900/90 border border-rose-100 dark:border-rose-950/60 shadow-xs">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Monthly Income</p>
                    <p className={`text-base font-black tabular-nums ${Number(monthlyIncome) < 15000 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                      {formatCurrency(Number(monthlyIncome))}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/90 p-3 dark:bg-slate-900/90 border border-rose-100 dark:border-rose-950/60 shadow-xs">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Existing Debts</p>
                    <p className="text-base font-black text-slate-800 dark:text-slate-200 tabular-nums">
                      {formatCurrency(Number(existingDebts || 0))}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/90 p-3 dark:bg-slate-900/90 border border-rose-100 dark:border-rose-950/60 shadow-xs">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Computed DTI</p>
                    <p className={`text-base font-black tabular-nums ${result.dtiRatio > 50 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                      {Number(result.dtiRatio || 0).toFixed(1)}%
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/90 p-3 dark:bg-slate-900/90 border border-rose-100 dark:border-rose-950/60 shadow-xs">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bureau Score</p>
                    <p className={`text-base font-black tabular-nums ${result.creditScore < 600 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                      {result.creditScore}{' '}
                      <span className="text-[10px] font-bold text-slate-500">
                        ({result.creditBand})
                      </span>
                    </p>
                  </div>
                </div>

                {/* Helpful Guidance Checklist */}
                <div className="rounded-xl bg-white/95 p-4 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Recommended Steps to Qualify for Future Approval:
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <li className="flex items-start space-x-2">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>
                        <strong>Request a Lower Loan Amount:</strong> Reducing your requested principal lowers monthly debt exposure.
                      </span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>
                        <strong>Clear Existing Loan/Card Dues:</strong> Reducing active EMIs directly brings down your DTI ratio below 50%.
                      </span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>
                        <strong>Add Verified Household Income:</strong> Re-applying with updated salary documents provides higher borrowing limit.
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Recovery Action Buttons */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    onClick={() => {
                      setResult(null);
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-11 px-5 shadow-sm rounded-xl text-xs dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                    Modify Salary / Debt Inputs
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setResult(null);
                      setRequestedAmount('50000');
                    }}
                    className="border-rose-300 text-rose-700 hover:bg-rose-100/60 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950 font-bold h-11 px-4 text-xs rounded-xl cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Try with Lower Amount (₹50,000)
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setResult(null);
                      setRequestedAmount('100000');
                    }}
                    className="border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 font-bold h-11 px-4 text-xs rounded-xl cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Try with ₹1 Lakh
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="bg-slate-50/70 py-4 dark:bg-slate-900/70 border-t border-slate-100 dark:border-slate-800 text-center">
        <p className="w-full text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Automated underwriting powered by pure business logic calculation without manual bias.</span>
        </p>
      </CardFooter>
    </Card>
  );
}
