'use client';

import React, { useState, useEffect } from 'react';
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
  ChevronLeft,
  Banknote,
  Percent,
  Check,
  Calculator,
  FileText,
  Camera,
  Landmark,
  HelpCircle,
  Award,
  BadgeCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/auth-context';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { BrandLogo } from '../components/ui/brand-logo';

// Step-by-step interactive carousel stages
const APPLICATION_STEPS = [
  {
    step: 1,
    badge: 'Step 1: Security & Identity',
    title: 'Dual 2FA Account Registration',
    desc: 'Create your account with your verified email and phone number. Our system validates both via secure 6-digit real-time OTPs to ensure 100% fraud protection.',
    icon: ShieldCheck,
    color: 'emerald',
    highlights: ['Live Email OTP (Gmail SMTP)', 'SMS Mobile Verification', 'Zero Spam / 256-Bit Encrypted'],
    metric: 'Instant (under 60s)',
  },
  {
    step: 2,
    badge: 'Step 2: KYC Verification',
    title: 'Instant Government KYC Check',
    desc: 'Provide your Indian PAN card or Aadhaar card details. Our automated identity engine validates your credentials in real-time against central databases.',
    icon: FileText,
    color: 'teal',
    highlights: ['PAN & Aadhaar Auto-Validation', 'Name & DOB Match Protocol', 'Paperless & 100% Digital'],
    metric: 'Real-Time Verification',
  },
  {
    step: 3,
    badge: 'Step 3: AI Credit Engine',
    title: 'Automated Credit & Eligibility Evaluation',
    desc: 'Enter your monthly income and current obligations. Our algorithmic credit engine instantly computes your Debt-to-Income (DTI) ratio, queries your CIBIL score, and sanctions loans up to ₹5,00,000.',
    icon: TrendingUp,
    color: 'cyan',
    highlights: ['Real-Time DTI & CIBIL Assessment', 'Prime Interest Rates from 12.5%', 'Sanction Limit ₹10k - ₹5 Lakhs'],
    metric: 'Instant Approval Decision',
  },
  {
    step: 4,
    badge: 'Step 4: Repayment Customizer',
    title: 'Dynamic EMI & Tenure Selection',
    desc: 'Customize your loan terms using our live financial solver. Choose tenures from 6 to 36 months with transparent flat/reducing APR, exact processing fees, and net disbursement calculations.',
    icon: Calculator,
    color: 'indigo',
    highlights: ['Newton-Raphson IRR Solver', 'Flexible Tenures (6, 12, 18, 24, 36 Mo)', 'Zero Hidden Charges'],
    metric: 'Transparent APR Matrix',
  },
  {
    step: 5,
    badge: 'Step 5: Sanction & Disbursement',
    title: 'Live Selfie & Bank e-Mandate',
    desc: 'Capture a secure live verification selfie and link your bank account via IFSC. Once our underwriters approve your dossier, funds are disbursed directly into your account.',
    icon: Landmark,
    color: 'emerald',
    highlights: ['Live Liveness Biometric Check', 'e-Mandate Automated Repayment', 'Direct NEFT/IMPS Bank Credit'],
    metric: 'Disbursed in 15 Minutes',
  },
];

// Frequently Asked Questions
const FAQS = [
  {
    q: 'What is the maximum loan amount I can apply for?',
    a: 'You can apply for personal loans ranging from ₹10,000 up to ₹5,00,000 (₹5 Lakhs), based on your monthly income, credit score, and Debt-to-Income ratio.',
  },
  {
    q: 'How fast is the loan approval and disbursement process?',
    a: 'Eligibility assessment is 100% instant. Once you complete your KYC, EMI selection, and live selfie submission, our underwriting team approves and disburses funds directly to your verified bank account in under 15 minutes.',
  },
  {
    q: 'What interest rates and charges apply?',
    a: 'Interest rates start from 12.5% p.a. for prime credit profiles (750+ CIBIL). A nominal 2% processing fee plus 18% GST applies upfront. We do not charge any hidden fees or unannounced deductions.',
  },
  {
    q: 'Is my personal information and bank details secure?',
    a: 'Yes. EZFinanz uses bank-grade 256-bit SSL encryption and strict ISO 27001 data governance standards. We comply with all RBI Digital Lending Guidelines.',
  },
  {
    q: 'Can I choose my repayment tenure and pre-close early?',
    a: 'Yes, we offer flexible repayment tenures of 6, 12, 18, 24, or 36 months. You can track all scheduled EMIs in your Borrower Dashboard.',
  },
];

export default function HomePage() {
  const { role, isAuthenticated } = useAuth();

  // Carousel active step index
  const [activeSlide, setActiveSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Interactive Live Calculator state on homepage
  const [calcAmount, setCalcAmount] = useState(200000);
  const [calcTenure, setCalcTenure] = useState(24);
  const interestRate = 13.5;

  // Real-time EMI math
  const monthlyRate = interestRate / 12 / 100;
  const emi = Math.round(
    (calcAmount * monthlyRate * Math.pow(1 + monthlyRate, calcTenure)) /
      (Math.pow(1 + monthlyRate, calcTenure) - 1)
  );
  const totalRepayment = emi * calcTenure;
  const totalInterest = totalRepayment - calcAmount;
  const processingFee = Math.round(calcAmount * 0.02);
  const gst = Math.round(processingFee * 0.18);
  const netDisbursement = calcAmount - (processingFee + gst);

  // FAQ Accordion open state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Auto-play carousel timer
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % APPLICATION_STEPS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const currentStep = APPLICATION_STEPS[activeSlide];
  const StepIcon = currentStep.icon;

  return (
    <div className="space-y-16 sm:space-y-24 pb-20">
      {/* 1. Hero FinTech Header Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 pt-14 pb-24 text-white sm:px-6 lg:px-8 border-b border-slate-800">
        {/* Glow ambient background effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[450px] w-[800px] rounded-full bg-emerald-500/15 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-teal-500/10 blur-[100px] pointer-events-none" />

        <div className="relative mx-auto max-w-5xl text-center">
          {/* Top Brand Highlight Pill */}
          <div className="inline-flex items-center space-x-2.5 rounded-full border border-emerald-500/40 bg-emerald-950/70 px-4 py-1.5 text-xs font-bold text-emerald-300 shadow-inner backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>AI-Driven Retail Lending & Underwriting Platform</span>
          </div>

          <h1 className="mt-6 text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl leading-tight">
            Instant Personal Loans <br />
            <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-emerald-200 bg-clip-text text-transparent">
              Powered by Pure Digital Underwriting
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
            Borrow ₹10,000 to ₹5,00,000 with real-time CIBIL verification, live EMI customized repayment, zero hidden charges, and direct 15-minute bank disbursement.
          </p>

          {/* Quick CTA Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup" className="inline-flex">
              <Button
                size="lg"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/25 text-sm px-8 h-13 rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>Apply for Loan</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Button>
            </Link>

            <Link href="/login" className="inline-flex">
              <Button
                size="lg"
                variant="outline"
                className="border-slate-700 bg-slate-800/90 text-white hover:bg-slate-700 text-sm px-8 h-13 font-bold rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>Sign In to Application</span>
              </Button>
            </Link>

            {role === 'ADMIN' && (
              <Link href="/admin" className="inline-flex">
                <Button
                  size="lg"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm px-6 h-13 rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Lock className="h-4 w-4 shrink-0" />
                  <span>Admin Console</span>
                </Button>
              </Link>
            )}
          </div>

          {/* Trust Highlights Metric Bar */}
          <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4 max-w-4xl mx-auto pt-8 border-t border-slate-800/80 text-left">
            <div className="flex items-start space-x-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="rounded-xl bg-emerald-950/90 p-2 border border-emerald-500/30 text-emerald-400 shrink-0">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Instant Approval</p>
                <p className="text-[11px] text-slate-400 font-medium">Algorithmic rules</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="rounded-xl bg-teal-950/90 p-2 border border-teal-500/30 text-teal-400 shrink-0">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">₹10k - ₹5 Lakhs</p>
                <p className="text-[11px] text-slate-400 font-medium">6 to 36 mo tenure</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="rounded-xl bg-indigo-950/90 p-2 border border-indigo-500/30 text-indigo-400 shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Dual 2FA Security</p>
                <p className="text-[11px] text-slate-400 font-medium">Live Email & Phone OTP</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="rounded-xl bg-cyan-950/90 p-2 border border-cyan-500/30 text-cyan-400 shrink-0">
                <Landmark className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Direct Disbursement</p>
                <p className="text-[11px] text-slate-400 font-medium">Straight to Bank A/C</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Step-by-Step Borrower Journey Carousel */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold px-3 py-1">
            <Layers className="mr-1.5 h-3.5 w-3.5" /> 5-Step Digital Onboarding
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            How Your Loan Gets Approved in Minutes
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
            Experience our completely paperless underwriting journey designed for speed, transparency, and top-tier security.
          </p>
        </div>

        {/* Carousel Stepper Tabs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2" role="tablist">
          {APPLICATION_STEPS.map((s, idx) => (
            <button
              key={s.step}
              onClick={() => {
                setActiveSlide(idx);
                setIsAutoPlaying(false);
              }}
              className={`flex items-center space-x-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeSlide === idx
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/15 scale-105'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[11px]">
                {s.step}
              </span>
              <span>{s.title.split(' ')[0]} {s.title.split(' ')[1]}</span>
            </button>
          ))}
        </div>

        {/* Active Stage Carousel Card */}
        <div className="mt-8 relative max-w-4xl mx-auto">
          <Card className="overflow-hidden border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-emerald-50/30 shadow-xl rounded-3xl dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
            <CardContent className="p-6 sm:p-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left Text details */}
                <div className="lg:col-span-7 space-y-4 text-left">
                  <div className="inline-flex items-center space-x-2 rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-3 py-1 text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
                    <span>{currentStep.badge}</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {currentStep.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    {currentStep.desc}
                  </p>

                  {/* Highlights checklist */}
                  <div className="space-y-2 pt-2">
                    {currentStep.highlights.map((h, i) => (
                      <div key={i} className="flex items-center space-x-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Link */}
                  <div className="pt-4">
                    <Link href="/apply">
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-11 px-5 rounded-xl shadow-md cursor-pointer">
                        <span>Experience Step {currentStep.step} Now</span>
                        <ArrowRight className="ml-2 h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Right Visual Box */}
                <div className="lg:col-span-5">
                  <div className="rounded-2xl border border-slate-200 bg-slate-900 p-6 text-white shadow-xl dark:border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
                        <StepIcon className="h-6 w-6" />
                      </div>
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                        {currentStep.metric}
                      </Badge>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400 font-medium">Progress Status</p>
                      <p className="text-lg font-black text-white">Stage {currentStep.step} of 5 Completed</p>
                    </div>

                    {/* Stage Progress Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2 transition-all duration-500"
                        style={{ width: `${(currentStep.step / 5) * 100}%` }}
                      />
                    </div>

                    <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-800 flex justify-between items-center">
                      <span>Automated Underwriting</span>
                      <span className="text-emerald-400 font-bold">✓ 100% Encrypted</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Carousel Navigation Buttons */}
          <div className="mt-4 flex items-center justify-between px-2">
            <button
              onClick={() => {
                setActiveSlide((prev) => (prev === 0 ? APPLICATION_STEPS.length - 1 : prev - 1));
                setIsAutoPlaying(false);
              }}
              className="flex items-center space-x-1 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous Step</span>
            </button>

            {/* Dots */}
            <div className="flex items-center space-x-1.5">
              {APPLICATION_STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setActiveSlide(i);
                    setIsAutoPlaying(false);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    activeSlide === i ? 'w-6 bg-emerald-600' : 'w-2 bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>

            <button
              onClick={() => {
                setActiveSlide((prev) => (prev + 1) % APPLICATION_STEPS.length);
                setIsAutoPlaying(false);
              }}
              className="flex items-center space-x-1 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span>Next Step</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 3. Interactive Live Loan EMI Calculator */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200/80 bg-slate-900 text-white p-6 sm:p-12 shadow-2xl relative overflow-hidden dark:border-slate-800">
          {/* Ambient Glows */}
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative">
            {/* Left Controls */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs font-bold mb-3">
                  <Calculator className="mr-1.5 h-3.5 w-3.5" /> Live Loan Estimator
                </Badge>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Calculate Your Monthly EMI Instantly
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">
                  Adjust desired loan amount (₹10k - ₹5 Lakhs) and tenure to preview your exact repayments.
                </p>
              </div>

              {/* Amount Slider */}
              <div className="space-y-3 rounded-2xl bg-slate-800/80 p-5 border border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Loan Amount</span>
                  <span className="text-xl font-black text-emerald-400 tabular-nums">
                    ₹{calcAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <input
                  type="range"
                  min={10000}
                  max={500000}
                  step={5000}
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                  <span>₹10,000</span>
                  <span>₹2.5 Lakhs</span>
                  <span>₹5,00,000</span>
                </div>
              </div>

              {/* Tenure Selector */}
              <div className="space-y-3 rounded-2xl bg-slate-800/80 p-5 border border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Repayment Tenure</span>
                  <span className="text-base font-black text-emerald-400">{calcTenure} Months ({calcTenure / 12} Yrs)</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[6, 12, 18, 24, 36].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setCalcTenure(m)}
                      className={`rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                        calcTenure === m
                          ? 'bg-emerald-500 text-slate-950 shadow-md scale-105'
                          : 'bg-slate-700/80 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {m} Mo
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Summary Card */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-emerald-500/30 bg-slate-950 p-6 sm:p-8 space-y-5 shadow-xl">
                <div>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Estimated Monthly EMI</span>
                  <div className="flex items-baseline space-x-1 mt-1">
                    <span className="text-3xl sm:text-4xl font-black text-white tabular-nums">
                      ₹{emi.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">/ month</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">
                    @ {interestRate}% fixed annual prime rate
                  </p>
                </div>

                <div className="border-t border-slate-800 pt-4 space-y-2.5 text-xs">
                  <div className="flex justify-between text-slate-300 font-medium">
                    <span>Principal Amount:</span>
                    <strong className="text-white font-bold">₹{calcAmount.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex justify-between text-slate-300 font-medium">
                    <span>Total Interest Payable:</span>
                    <strong className="text-teal-400 font-bold">₹{totalInterest.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex justify-between text-slate-300 font-medium">
                    <span>Processing Fee (2% + GST):</span>
                    <strong className="text-slate-300 font-bold">₹{(processingFee + gst).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex justify-between text-slate-300 font-medium">
                    <span>Net Disbursement to Bank:</span>
                    <strong className="text-emerald-400 font-bold">₹{netDisbursement.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold text-white">
                    <span>Total Repayment:</span>
                    <strong className="text-emerald-400 font-black">₹{totalRepayment.toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                <Link href="/apply" className="block pt-2">
                  <Button className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs h-12 rounded-xl shadow-md cursor-pointer">
                    Apply for this ₹{(calcAmount / 100000).toFixed(1)} Lakh Loan
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Why Choose EZFinanz (Trust & Security Pillars) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold px-3 py-1">
            <Award className="mr-1.5 h-3.5 w-3.5" /> Institutional Trust & Compliance
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Why Thousands Trust EZFinanz
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
            Built from the ground up for strict regulatory compliance, transparent financial mathematics, and user data privacy.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="rounded-2xl border-slate-200/80 bg-white p-6 shadow-fintech dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">RBI Regulated Standards</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              Partnered with licensed NBFC networks adhering strictly to Reserve Bank of India digital lending guidelines.
            </p>
          </Card>

          <Card className="rounded-2xl border-slate-200/80 bg-white p-6 shadow-fintech dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400">
              <Lock className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">256-Bit SSL & ISO 27001</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              Your personal data, KYC identity proofs, and bank credentials are encrypted at rest and in transit.
            </p>
          </Card>

          <Card className="rounded-2xl border-slate-200/80 bg-white p-6 shadow-fintech dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <Percent className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">Zero Hidden Charges</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              All interest rates, processing fees, and GST charges are clearly stated before you accept terms.
            </p>
          </Card>

          <Card className="rounded-2xl border-slate-200/80 bg-white p-6 shadow-fintech dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-100 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-400">
              <Zap className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">15-Minute Disbursement</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              Instant automated underwriting coupled with rapid administrative review gets funds to your bank in minutes.
            </p>
          </Card>
        </div>
      </section>

      {/* 5. Eligibility Criteria & Required Documents Checklist */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Eligibility Rules */}
          <Card className="rounded-3xl border-slate-200/80 bg-white p-6 sm:p-8 shadow-fintech dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
            <div className="space-y-4">
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs">
                Eligibility Criteria
              </Badge>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Who Can Apply for an EZFinanz Loan?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Our simple eligibility thresholds ensure quick sanctions for working professionals:
              </p>

              <div className="space-y-3 pt-2">
                {[
                  { title: 'Nationality', desc: 'Must be a Resident Indian Citizen' },
                  { title: 'Age Bracket', desc: 'Between 21 and 58 years at the time of application' },
                  { title: 'Minimum Monthly Income', desc: 'Net take-home salary or business income of ₹25,000+' },
                  { title: 'Employment Status', desc: 'Salaried employee or self-employed professional with active work proof' },
                  { title: 'Credit History', desc: 'Valid CIBIL score (credit scores 650+ qualify for instant prime rates)' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-850">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Documents Required */}
          <Card className="rounded-3xl border-slate-200/80 bg-white p-6 sm:p-8 shadow-fintech dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
            <div className="space-y-4">
              <Badge className="bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-bold text-xs">
                Document Checklist
              </Badge>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                100% Digital Document Verification
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                No physical paperwork or visits. Simply have the following digital credentials ready:
              </p>

              <div className="space-y-3 pt-2">
                {[
                  { title: 'Identity Proof', desc: 'Valid Permanent Account Number (PAN) card' },
                  { title: 'Address & KYC Proof', desc: 'Aadhaar Card or Passport with valid residential address' },
                  { title: 'Income Details', desc: 'Employer Name, monthly take-home salary, and designation' },
                  { title: 'Bank Account & IFSC', desc: 'Active savings account number for e-mandate and direct credit' },
                  { title: 'Live Selfie Camera', desc: 'Device camera access for biometric liveness verification' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-850">
                    <BadgeCheck className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6">
              <Link href="/signup">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-11 rounded-xl shadow-md cursor-pointer">
                  Start My Loan Application Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* 6. Frequently Asked Questions (FAQ Accordion) */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-8">
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold px-3 py-1">
            <HelpCircle className="mr-1.5 h-3.5 w-3.5" /> Transparent FAQ
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
            Everything you need to know about our personal loan process, eligibility, and security.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {faq.q}
                  </span>
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-transform ${
                      isOpen ? 'rotate-180 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : ''
                    }`}
                  >
                    <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. Bottom Call-To-Action Banner */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-tr from-slate-950 via-emerald-950 to-slate-900 border border-emerald-500/30 p-8 sm:p-14 text-white text-center shadow-2xl relative overflow-hidden">
          <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
          <div className="relative max-w-2xl mx-auto space-y-5">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Ready to Get Your Instant Personal Loan?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              Join thousands of satisfied borrowers across India. Complete your application in under 3 minutes with zero paperwork.
            </p>
            <div className="pt-3 flex flex-wrap items-center justify-center gap-4">
              <Link href="/signup">
                <Button className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm px-8 h-12 rounded-xl shadow-lg shadow-emerald-500/30 cursor-pointer">
                  Start Loan Application (₹10k - ₹5L)
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" className="border-slate-700 bg-slate-900/80 text-white hover:bg-slate-800 text-sm px-7 h-12 font-bold rounded-xl cursor-pointer">
                  Borrower Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
