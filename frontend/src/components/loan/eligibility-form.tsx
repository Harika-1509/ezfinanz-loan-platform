'use client';

import React, { useState, useEffect } from 'react';
import { z } from 'zod';
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
        if (check && check.result) {
          const score = check.creditScore || 750;
          const band: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' =
            score >= 750 ? 'EXCELLENT' : score >= 650 ? 'GOOD' : score >= 600 ? 'FAIR' : 'POOR';

          setResult({
            decision: check.result,
            creditScore: score,
            creditBand: band,
            dtiRatio: check.dtiRatio,
            maxEligibleAmount: check.maxApprovedAmount,
            interestRate: score >= 750 ? 12.5 : score >= 650 ? 14.5 : 16.5,
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
      <Card className="border-slate-200/80 shadow-glass">
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Loading credit underwriting engine...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200/80 shadow-glass backdrop-blur-md">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5 text-teal-600">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                Step 3: Credit & Underwriting Eligibility
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Real-time debt-to-income and credit band calculation.
              </CardDescription>
            </div>
          </div>
          {result && (
            <Badge
              variant={
                result.decision === 'ELIGIBLE'
                  ? 'success'
                  : result.decision === 'PARTIALLY_ELIGIBLE'
                  ? 'secondary'
                  : 'destructive'
              }
              className="text-xs px-3 py-1 font-bold"
            >
              {result.decision.replace('_', ' ')}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Error Alert */}
        {errorMessage && (
          <div role="alert" className="flex items-start space-x-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200 font-medium">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1 font-bold">{errorMessage}</div>
          </div>
        )}

        {/* Bureau Note */}
        <div className="flex items-start space-x-2 rounded-xl border border-teal-200 bg-teal-50/70 p-3.5 text-xs text-teal-950 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-200">
          <Info className="h-4 w-4 flex-shrink-0 text-teal-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Automated Bureau Credit Score Simulation</p>
            <p className="text-[11px] text-teal-800 dark:text-teal-300 mt-0.5">
              Score is pulled from the simulated credit bureau benchmark (Score ≥ 750 with DTI ≤ 50% grants instant prime terms).
            </p>
          </div>
        </div>

        {/* If result is NOT yet calculated, show Form */}
        {!result ? (
          <form onSubmit={handleEvaluate} className="space-y-4">
            {/* Income & Amount */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="monthlyIncome" required>
                  Monthly Net Take-Home Salary (₹)
                </Label>
                <Input
                  id="monthlyIncome"
                  type="number"
                  placeholder="75000"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  error={fieldErrors.monthlyIncome}
                  icon={<IndianRupee className="h-4 w-4" />}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="requestedAmount" required>
                  Desired Loan Amount (₹50k - ₹10L)
                </Label>
                <Input
                  id="requestedAmount"
                  type="number"
                  placeholder="300000"
                  value={requestedAmount}
                  onChange={(e) => setRequestedAmount(e.target.value)}
                  error={fieldErrors.requestedAmount}
                  icon={<TrendingUp className="h-4 w-4" />}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Quick Amount Selector Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1" role="group" aria-label="Quick Select Loan Amount">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Quick Select:</span>
              {[100000, 300000, 500000, 1000000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickAmount(amt)}
                  aria-pressed={requestedAmount === amt.toString()}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all min-h-[34px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                    requestedAmount === amt.toString()
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  ₹{(amt / 100000).toFixed(amt % 100000 === 0 ? 0 : 1)} Lakh
                </button>
              ))}
            </div>

            {/* Existing Debts */}
            <div className="space-y-1.5">
              <Label htmlFor="existingDebts" required>
                Total Existing Monthly Loan EMIs / Credit Card Payments (₹)
              </Label>
              <Input
                id="existingDebts"
                type="number"
                placeholder="10000"
                value={existingDebts}
                onChange={(e) => setExistingDebts(e.target.value)}
                error={fieldErrors.existingDebts}
                icon={<IndianRupee className="h-4 w-4" />}
                disabled={isLoading}
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Enter ₹0 if you currently have no other active monthly debt obligations.
              </p>
            </div>

            {/* Employer & Designation */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="employerName" required>
                  Current Employer Name
                </Label>
                <Input
                  id="employerName"
                  type="text"
                  placeholder="e.g. Infosys / Google"
                  value={employerName}
                  onChange={(e) => setEmployerName(e.target.value)}
                  error={fieldErrors.employerName}
                  icon={<Building2 className="h-4 w-4" />}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="designation" required>
                  Job Designation / Role
                </Label>
                <Input
                  id="designation"
                  type="text"
                  placeholder="e.g. Senior Software Engineer"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  error={fieldErrors.designation}
                  icon={<Briefcase className="h-4 w-4" />}
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 shadow-sm mt-4 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculating Instant Eligibility...
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
              <div className="rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-6 text-slate-900 dark:border-emerald-800 dark:text-white space-y-4 shadow-glass">
                <div className="flex items-center space-x-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-glow">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-emerald-950 dark:text-emerald-300">
                      Congratulations! You are Eligible
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Your financial profile qualifies for prime personal loan terms.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-900/60">
                  <div className="rounded-xl bg-white/90 p-3 dark:bg-slate-900/90 border border-emerald-100 dark:border-emerald-950 shadow-xs">
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Max Sanction Limit</p>
                    <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(result.maxEligibleAmount)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/90 p-3 dark:bg-slate-900/90 border border-emerald-100 dark:border-emerald-950 shadow-xs">
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">CIBIL Score</p>
                    <p className="text-base font-black text-slate-900 dark:text-white">
                      {result.creditScore}{' '}
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        ({result.creditBand})
                      </span>
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/90 p-3 dark:bg-slate-900/90 border border-emerald-100 dark:border-emerald-950 shadow-xs">
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">DTI Ratio</p>
                    <p className="text-base font-black text-teal-600 dark:text-teal-400">
                      {result.dtiRatio.toFixed(1)}%
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/90 p-3 dark:bg-slate-900/90 border border-emerald-100 dark:border-emerald-950 shadow-xs">
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Indicative Rate</p>
                    <p className="text-base font-black text-slate-900 dark:text-white">
                      {result.interestRate}% p.a.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <Button
                    onClick={() => {
                      if (onSuccess) onSuccess(result);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-6 shadow-glow flex-1 sm:flex-none"
                  >
                    Proceed to Loan Terms & EMI Selection
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setResult(null)}
                    className="text-xs font-bold"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Re-calculate
                  </Button>
                </div>
              </div>
            )}

            {/* Outcome 2: PARTIALLY_ELIGIBLE */}
            {result.decision === 'PARTIALLY_ELIGIBLE' && (
              <div className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-6 text-slate-900 dark:border-amber-800 dark:text-white space-y-4 shadow-glass">
                <div className="flex items-center space-x-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-amber-950 dark:text-amber-300">
                      Partially Eligible
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      We can approve an adjusted loan amount based on your existing monthly obligations.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-amber-200/60 dark:border-amber-900/60">
                  <div className="rounded-xl bg-white/90 p-3 dark:bg-slate-900/90 border border-amber-100 dark:border-amber-950 shadow-xs">
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Approved Limit</p>
                    <p className="text-base font-black text-amber-600 dark:text-amber-400">
                      {formatCurrency(result.maxEligibleAmount)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/90 p-3 dark:bg-slate-900/90 border border-amber-100 dark:border-amber-950 shadow-xs">
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">CIBIL Score</p>
                    <p className="text-base font-black text-slate-900 dark:text-white">
                      {result.creditScore}{' '}
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        ({result.creditBand})
                      </span>
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/90 p-3 dark:bg-slate-900/90 border border-amber-100 dark:border-amber-950 shadow-xs">
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">DTI Ratio</p>
                    <p className="text-base font-black text-slate-800 dark:text-slate-200">
                      {result.dtiRatio.toFixed(1)}%
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/90 p-3 dark:bg-slate-900/90 border border-amber-100 dark:border-amber-950 shadow-xs">
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Interest Rate</p>
                    <p className="text-base font-black text-slate-900 dark:text-white">
                      {result.interestRate}% p.a.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <Button
                    onClick={() => {
                      if (onSuccess) onSuccess(result);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-11 px-6 shadow-md flex-1 sm:flex-none"
                  >
                    Proceed with Adjusted Limit (₹{(result.maxEligibleAmount / 100000).toFixed(1)}L)
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setResult(null)}
                    className="text-xs font-bold"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Modify Details
                  </Button>
                </div>
              </div>
            )}

            {/* Outcome 3: NOT_ELIGIBLE (Graceful Non-Dead-End) */}
            {result.decision === 'NOT_ELIGIBLE' && (
              <div className="rounded-2xl border border-slate-300 bg-slate-50 p-6 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <AlertCircle className="h-6 w-6 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                      Application Criteria Not Met
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Based on current debt-to-income ({result.dtiRatio.toFixed(1)}%) or bureau parameters, automated underwriting cannot approve the requested amount at this time.
                    </p>
                  </div>
                </div>

                {/* Helpful Guidance Checklist */}
                <div className="rounded-xl bg-white p-4 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Recommended Actions to Qualify:
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <li className="flex items-start space-x-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>
                        <strong>Request a Lower Loan Amount:</strong> Reducing your principal decreases monthly debt burden.
                      </span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>
                        <strong>Clear Active Credit Card / Personal Loans:</strong> Lowering existing EMIs will significantly improve your DTI ratio.
                      </span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>
                        <strong>Re-apply with Co-Borrower:</strong> Adding eligible household income provides higher sanction headroom.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="pt-2 flex items-center space-x-3">
                  <Button
                    type="button"
                    onClick={() => {
                      setResult(null);
                      setRequestedAmount('100000');
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-6 shadow-sm"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Re-calculate with Lower Amount (₹1 Lakh)
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="bg-slate-50/70 py-3.5 dark:bg-slate-900/70 border-t border-slate-200/80 dark:border-slate-800 text-center">
        <p className="w-full text-[11px] text-slate-600 dark:text-slate-400 font-medium">
          ⚡ Automated underwriting powered by pure business logic calculation without manual bias.
        </p>
      </CardFooter>
    </Card>
  );
}
