import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CheckCircle2,
  Layers,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  ArrowRight,
  Database,
} from 'lucide-react';

export default function Home() {
  const steps = [
    {
      num: '01',
      title: 'Auth & Verification',
      desc: 'Email / Phone OTP & OAuth with secure session management.',
    },
    {
      num: '02',
      title: 'KYC Onboarding',
      desc: 'Identity, PAN/Aadhaar details & document attachments.',
    },
    {
      num: '03',
      title: 'Eligibility Engine',
      desc: 'Automated DTI, CIBIL credit scoring & risk assessment.',
    },
    {
      num: '04',
      title: 'EMI & IRR Terms',
      desc: 'Interactive tenure selection with real-time recalculation.',
    },
    {
      num: '05',
      title: 'Bank & Declaration',
      desc: 'Disbursement account details & verified consent.',
    },
    {
      num: '06',
      title: 'Live Selfie & Review',
      desc: 'Biometric photo capture & Admin audit workbench.',
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100/60 pb-16">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white shadow-md shadow-emerald-600/20">
              EZ
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                EZ<span className="text-emerald-600">FINANZ</span>
              </span>
              <span className="ml-2 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                Platform v1.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="success" className="gap-1 px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Scaffolding Ready
            </Badge>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="mx-auto max-w-5xl px-6 pt-14 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/70 px-4 py-1.5 text-xs font-medium text-emerald-800 mb-6">
          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
          End-to-End Personal Loan Application Solution
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
          Smarter, Faster <span className="text-emerald-600">Personal Loans</span> for Modern
          Borrowers
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 leading-relaxed">
          Full-stack monorepo scaffolded with Next.js 15 (App Router), Tailwind CSS, shadcn/ui,
          Express.js, TypeScript, and Prisma ORM with PostgreSQL.
        </p>
      </div>

      {/* Architecture Cards */}
      <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 px-6 md:grid-cols-2">
        <Card className="border-slate-200/90 shadow-sm transition-all hover:shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Smartphone className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-xs">
                Frontend Workspace
              </Badge>
            </div>
            <CardTitle className="mt-4 text-xl">Next.js 15 + shadcn/ui</CardTitle>
            <CardDescription>
              Modern App Router architecture with Tailwind CSS, responsive layouts, and accessible
              UI primitives.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Tailwind CSS & Design Tokens configured</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>shadcn/ui Button, Card, Badge components</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>
                TypeScript path aliases (
                <code className="text-xs font-mono bg-slate-100 px-1 py-0.5 rounded">@/*</code>)
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 shadow-sm transition-all hover:shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <Server className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-xs">
                Backend Workspace
              </Badge>
            </div>
            <CardTitle className="mt-4 text-xl">Express.js + TypeScript + Prisma</CardTitle>
            <CardDescription>
              Layered architecture with controllers, validation schemas, error handling, and Prisma
              PostgreSQL schema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <span>Layered controllers, routes, middlewares</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <span>Prisma Schema for Users & Loan Applications</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <span>
                Health Endpoint at{' '}
                <code className="text-xs font-mono bg-slate-100 px-1 py-0.5 rounded">
                  /api/v1/health
                </code>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Planned Loan Workflow Pipeline */}
      <div className="mx-auto mt-16 max-w-5xl px-6">
        <div className="mb-8 flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Application Journey Pipeline</h2>
            <p className="text-sm text-slate-500">
              Upcoming multi-step customer flow and admin approval system.
            </p>
          </div>
          <Badge variant="secondary" className="gap-1.5">
            <Layers className="h-3.5 w-3.5" /> 6 Steps
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.num}
              className="group rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-emerald-600">
                  STEP {step.num}
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-emerald-600" />
              </div>
              <h3 className="mt-3 font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
