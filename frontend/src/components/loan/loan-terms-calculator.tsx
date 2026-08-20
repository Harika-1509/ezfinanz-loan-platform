'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Calculator,
  Percent,
  TrendingUp,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sparkles,
  Info,
  Calendar,
  Layers,
  ArrowDownToLine,
  Receipt,
  HelpCircle,
} from 'lucide-react';
import { loanTermsSchema, extractFieldErrors } from '../../lib/validation';
import { useAuth } from '../../contexts/auth-context';
import { apiClient } from '../../lib/api-client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';

export interface LoanTermsBreakdown {
  amount: number;
  tenureMonths: number;
  interestRate: number;
  processingFee: number;
  gst: number;
  otherCharges: number;
  totalCharges: number;
  netDisbursement: number;
  emi: number;
  totalInterest: number;
  totalRepayment: number;
  irr: number;
}

export interface LoanTermsCalculatorProps {
  onSuccess?: (confirmedTerms: LoanTermsBreakdown) => void;
}

const TENURE_OPTIONS = [
  { months: 6, label: '6 Months', tag: 'Fast Payoff', badgeColor: 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200' },
  { months: 12, label: '12 Months (1 Yr)', tag: 'Popular', badgeColor: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200' },
  { months: 18, label: '18 Months', tag: 'Balanced', badgeColor: 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200' },
  { months: 24, label: '24 Months (2 Yrs)', tag: 'Recommended', badgeColor: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200' },
  { months: 36, label: '36 Months (3 Yrs)', tag: 'Lowest EMI', badgeColor: 'bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200' },
];

export function LoanTermsCalculator({ onSuccess }: LoanTermsCalculatorProps) {
  const { updateApplicationStage } = useAuth();

  // Calculation Parameters
  const [amount, setAmount] = useState<number>(300000);
  const [tenureMonths, setTenureMonths] = useState<number>(24);
  const [maxApprovedAmount, setMaxApprovedAmount] = useState<number>(500000);

  // Result Breakdown
  const [breakdown, setBreakdown] = useState<LoanTermsBreakdown | null>(null);

  // UI States
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // In-memory calculation memoization cache to prevent redundant network calls
  const calculationCacheRef = useRef<Map<string, LoanTermsBreakdown>>(new Map());
  const lastCalculatedParamsRef = useRef<{ amount: number; tenureMonths: number } | null>(null);

  // Helper currency formatter
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // 1. Initial Load: Fetch Options and Max Approved Limit
  useEffect(() => {
    async function loadOptions() {
      try {
        const res = await apiClient.get<any>('/loan-terms/options');
        if (res.data) {
          const maxLimit = Number(res.data.maxApprovedAmount) || 500000;
          setMaxApprovedAmount(maxLimit);

          // If current terms exist, initialize with them
          if (res.data.currentTerms) {
            const current = res.data.currentTerms;
            const initAmount = Number(current.amount) || Math.min(300000, maxLimit);
            const initTenure = Number(current.tenureMonths) || 24;
            setAmount(initAmount);
            setTenureMonths(initTenure);
          } else {
            setAmount(Math.min(300000, maxLimit));
          }
        }
      } catch (err) {
        console.warn('Could not load loan options metadata, fallback to defaults:', err);
      } finally {
        setIsInitializing(false);
      }
    }
    loadOptions();
  }, []);

  // 2. Perform Backend Calculation with In-Memory Caching & Deduplication
  const fetchLiveCalculation = useCallback(
    async (targetAmount: number, targetTenure: number) => {
      const cacheKey = `${targetAmount}_${targetTenure}`;

      // Check in-memory cache first for instant sub-millisecond retrieval
      const cached = calculationCacheRef.current.get(cacheKey);
      if (cached) {
        setBreakdown(cached);
        lastCalculatedParamsRef.current = { amount: targetAmount, tenureMonths: targetTenure };
        setErrorMessage(null);
        return;
      }

      // Avoid duplicate in-flight network call if identical to currently calculated terms
      if (
        lastCalculatedParamsRef.current &&
        lastCalculatedParamsRef.current.amount === targetAmount &&
        lastCalculatedParamsRef.current.tenureMonths === targetTenure
      ) {
        return;
      }

      setIsCalculating(true);
      setErrorMessage(null);

      try {
        const res = await apiClient.post<any>('/loan-terms/calculate', {
          amount: targetAmount,
          tenureMonths: targetTenure,
        });

        const data = res.data;
        const resultBreakdown = data?.breakdown || data?.loanTerms;
        if (resultBreakdown) {
          const formattedBreakdown: LoanTermsBreakdown = {
            amount: Number(resultBreakdown.amount),
            tenureMonths: Number(resultBreakdown.tenureMonths),
            interestRate: Number(resultBreakdown.interestRate),
            processingFee: Number(resultBreakdown.processingFee),
            gst: Number(resultBreakdown.gst),
            otherCharges: Number(resultBreakdown.otherCharges),
            totalCharges: Number(resultBreakdown.totalCharges),
            netDisbursement: Number(resultBreakdown.netDisbursement),
            emi: Number(resultBreakdown.emi),
            totalInterest: Number(resultBreakdown.totalInterest),
            totalRepayment: Number(resultBreakdown.totalRepayment),
            irr: Number(resultBreakdown.irr),
          };

          // Store in cache
          calculationCacheRef.current.set(cacheKey, formattedBreakdown);
          lastCalculatedParamsRef.current = { amount: targetAmount, tenureMonths: targetTenure };
          setBreakdown(formattedBreakdown);
        }
      } catch (err) {
        const { generalMessage } = extractFieldErrors(
          err,
          'Could not update calculations. Please check connection.'
        );
        setErrorMessage(generalMessage);
      } finally {
        setIsCalculating(false);
      }
    },
    []
  );

  // 3. Debounced trigger on Amount or Tenure changes (300ms)
  useEffect(() => {
    if (isInitializing) return;

    // Check if immediate cache hit exists to update UI instantly without waiting for debounce
    const cacheKey = `${amount}_${tenureMonths}`;
    const cached = calculationCacheRef.current.get(cacheKey);
    if (cached) {
      setBreakdown(cached);
      lastCalculatedParamsRef.current = { amount, tenureMonths };
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchLiveCalculation(amount, tenureMonths);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [amount, tenureMonths, isInitializing, fetchLiveCalculation]);

  // Handle Amount change via slider or quick pills
  const handleAmountChange = (newAmt: number) => {
    const clamped = Math.max(10000, Math.min(newAmt, maxApprovedAmount));
    setAmount(clamped);
  };

  // Handle Confirmation of Selection
  const handleConfirm = async () => {
    const validation = loanTermsSchema.safeParse({ amount, tenureMonths });
    if (!validation.success) {
      setErrorMessage(validation.error.errors[0].message);
      return;
    }

    setIsConfirming(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await apiClient.post<any>('/loan-terms/confirm', {
        amount,
        tenureMonths,
      });

      const confirmedData = res.data?.breakdown || res.data?.loanTerms || breakdown;
      updateApplicationStage('EMI_SELECTED');
      setSuccessMessage('Loan terms locked & confirmed successfully! Proceeding to bank verification...');

      setTimeout(() => {
        if (onSuccess && confirmedData) {
          onSuccess(confirmedData);
        }
      }, 1000);
    } catch (err) {
      const { generalMessage } = extractFieldErrors(
        err,
        'Failed to confirm loan terms. Please try again.'
      );
      setErrorMessage(generalMessage);
    } finally {
      setIsConfirming(false);
    }
  };

  if (isInitializing) {
    return (
      <Card className="border-slate-200/80 shadow-glass">
        <CardContent className="flex flex-col items-center justify-center py-16 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Initializing live underwriting terms matrix...
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate percentage splits for the visual breakdown bar
  const totalRepay = breakdown ? breakdown.totalRepayment : amount;
  const principalPercent = totalRepay > 0 ? (amount / totalRepay) * 100 : 75;
  const interestPercent = totalRepay > 0 ? (Math.max(0, totalRepay - amount) / totalRepay) * 100 : 25;

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {errorMessage && (
        <div role="alert" className="flex items-start space-x-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1 font-bold">{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div role="status" className="flex items-start space-x-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600 mt-0.5" />
          <div className="flex-1 font-bold">{successMessage}</div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Interactive Loan Configuration (7 Cols) */}
        <div className="space-y-6 lg:col-span-7">
          <Card className="border-slate-200/80 shadow-glass">
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <Calculator className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                      Step 4: Customize Loan & EMI
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                      Adjust your desired principal and tenure to find your ideal monthly payment.
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold">
                  <Sparkles className="mr-1 h-3 w-3" /> Live IRR Solver
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Loan Amount Input & Slider */}
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <Label htmlFor="loanAmount" className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Required Loan Amount
                  </Label>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Max Approved: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(maxApprovedAmount)}</strong>
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-500">
                    ₹
                  </span>
                  <input
                    id="loanAmount"
                    type="number"
                    value={amount}
                    min={10000}
                    max={maxApprovedAmount}
                    step={5000}
                    aria-label="Loan Principal Amount in Rupees"
                    onChange={(e) => handleAmountChange(Number(e.target.value))}
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-8 pr-4 text-xl font-extrabold text-slate-900 transition-all focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                {/* Range Slider */}
                <div className="pt-2">
                  <Slider
                    value={amount}
                    min={10000}
                    max={maxApprovedAmount}
                    step={5000}
                    aria-label="Loan Principal Slider"
                    onChange={handleAmountChange}
                  />
                  <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    <span>₹10,000</span>
                    <span>{formatCurrency(Math.round(maxApprovedAmount / 2))}</span>
                    <span>{formatCurrency(maxApprovedAmount)}</span>
                  </div>
                </div>

                {/* Quick Selection Pills */}
                <div className="flex flex-wrap gap-2 pt-1" role="group" aria-label="Quick Loan Amount Presets">
                  {[100000, 200000, 300000, 400000, maxApprovedAmount]
                    .filter((amt, idx, arr) => amt <= maxApprovedAmount && arr.indexOf(amt) === idx)
                    .map((quickAmt) => (
                      <button
                        key={quickAmt}
                        type="button"
                        onClick={() => handleAmountChange(quickAmt)}
                        aria-pressed={amount === quickAmt}
                        className={`inline-flex items-center justify-center rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all min-h-[36px] leading-normal text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                          amount === quickAmt
                            ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                            : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                        }`}
                      >
                        {formatCurrency(quickAmt)}
                      </button>
                    ))}
                </div>
              </div>

              {/* Tenure Selection Grid (Responsive 2-col on mobile, 3-col on tablet, 5-col on desktop) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Repayment Tenure
                  </Label>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Select duration
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5" role="group" aria-label="Tenure Duration Options">
                  {TENURE_OPTIONS.map((opt) => {
                    const isSelected = tenureMonths === opt.months;
                    return (
                      <button
                        key={opt.months}
                        type="button"
                        onClick={() => setTenureMonths(opt.months)}
                        aria-pressed={isSelected}
                        aria-label={`${opt.months} months repayment tenure (${opt.tag})`}
                        className={`group relative flex flex-col items-center justify-center rounded-2xl border p-3.5 transition-all min-h-[88px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs ring-2 ring-emerald-600 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-200'
                            : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700'
                        }`}
                      >
                        <span className={`mb-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold ${opt.badgeColor}`}>
                          {opt.tag}
                        </span>
                        <span className="text-sm font-black">{opt.months} Mo</span>
                        <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">
                          {opt.months >= 12 ? `${opt.months / 12} Yrs` : `${opt.months} Mos`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visual Split: Principal vs Total Interest */}
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-800 dark:text-slate-200">Total Repayment Breakdown</span>
                  <span className="text-slate-950 dark:text-white font-black">
                    {formatCurrency(breakdown?.totalRepayment || amount)}
                  </span>
                </div>

                <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="presentation">
                  <div
                    className="bg-emerald-500 transition-all duration-300"
                    style={{ width: `${principalPercent}%` }}
                    title={`Principal: ${principalPercent.toFixed(1)}%`}
                  />
                  <div
                    className="bg-teal-500 transition-all duration-300"
                    style={{ width: `${interestPercent}%` }}
                    title={`Interest: ${interestPercent.toFixed(1)}%`}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                  <div className="flex items-center space-x-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
                    <span>Principal: <strong>{formatCurrency(amount)}</strong> ({principalPercent.toFixed(0)}%)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-teal-500" aria-hidden="true" />
                    <span>Interest: <strong>{formatCurrency(breakdown?.totalInterest || 0)}</strong> ({interestPercent.toFixed(0)}%)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Breakdown Panel (5 Cols) */}
        <div className="space-y-6 lg:col-span-5">
          <Card
            className="relative overflow-hidden border-emerald-600/30 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white shadow-xl"
            aria-live="polite"
          >
            {/* Subtle glowing orb background */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-teal-500/10 blur-3xl" />

            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Calculated Monthly EMI
                </span>
                {isCalculating && (
                  <span className="flex items-center text-[10px] font-bold text-emerald-300">
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Calculating...
                  </span>
                )}
              </div>

              {/* Big Hero Monthly EMI */}
              <div className="pt-2">
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                    {breakdown ? formatCurrency(breakdown.emi) : '₹0'}
                  </span>
                  <span className="text-sm font-semibold text-slate-300">/ month</span>
                </div>
                <p className="mt-1 text-xs text-slate-300 font-medium">
                  For {tenureMonths} monthly instalments @ {breakdown ? breakdown.interestRate : 14}% p.a.
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-2">
              <div className="border-t border-slate-800" />

              {/* Key Rates Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-slate-800 bg-slate-800/60 p-3">
                  <div className="text-[11px] font-bold text-slate-300">Annual Interest Rate</div>
                  <div className="mt-1 text-lg font-black text-white">
                    {breakdown ? `${breakdown.interestRate}%` : '--'}
                  </div>
                  <div className="text-[10px] text-slate-400">Fixed Flat/Reducing</div>
                </div>

                <div className="rounded-xl border border-emerald-900 bg-emerald-950/50 p-3">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-300">
                    <span>Effective IRR (APR)</span>
                    <Percent className="h-3 w-3 text-emerald-400" />
                  </div>
                  <div className="mt-1 text-lg font-black text-emerald-400">
                    {breakdown ? `${breakdown.irr}%` : '--'}
                  </div>
                  <div className="text-[10px] text-emerald-300/80">Newton-Raphson solved</div>
                </div>
              </div>

              {/* Disbursement & Deductions Breakdown */}
              <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-200">
                  <span>Sanctioned Principal</span>
                  <span>{formatCurrency(amount)}</span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span>Processing Fee</span>
                  <span>{formatCurrency(breakdown?.processingFee || 0)}</span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span>GST on Fee (18%)</span>
                  <span>{formatCurrency(breakdown?.gst || 0)}</span>
                </div>

                {breakdown && breakdown.otherCharges > 0 && (
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Admin & Stamp Charges</span>
                    <span>{formatCurrency(breakdown.otherCharges)}</span>
                  </div>
                )}

                <div className="border-t border-slate-800 pt-1.5" />

                <div className="flex items-center justify-between text-slate-300">
                  <span>Total Upfront Deductions</span>
                  <span className="text-rose-400 font-bold">
                    -{formatCurrency(breakdown?.totalCharges || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-emerald-950/80 p-2.5 font-bold text-emerald-300 border border-emerald-900/50">
                  <div className="flex items-center space-x-1.5">
                    <ArrowDownToLine className="h-4 w-4 text-emerald-400" />
                    <span>Net Disbursement to Bank</span>
                  </div>
                  <span className="text-sm font-black text-white">
                    {formatCurrency(breakdown?.netDisbursement || 0)}
                  </span>
                </div>
              </div>

              {/* Repayment Summary */}
              <div className="space-y-1.5 rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Total Interest Payable</span>
                  <span className="text-slate-100 font-bold">{formatCurrency(breakdown?.totalInterest || 0)}</span>
                </div>
                <div className="flex items-center justify-between font-bold text-slate-100">
                  <span>Total Repayment Amount</span>
                  <span className="text-emerald-400 font-black">{formatCurrency(breakdown?.totalRepayment || 0)}</span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={isConfirming || isCalculating || !breakdown}
                className="h-12 w-full rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 font-black text-slate-950 shadow-lg shadow-emerald-500/20 hover:from-teal-300 hover:to-emerald-300 active:scale-[0.99] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirming Terms...
                  </>
                ) : (
                  <>
                    Confirm & Lock Loan Terms
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
