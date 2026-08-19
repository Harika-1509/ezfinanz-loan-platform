import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HealthChecker } from '@/components/health-checker';
import {
  CheckCircle2,
  Layers,
  Server,
  Smartphone,
  Sparkles,
  ArrowRight,
  Shield,
  FileCheck2,
  Code2,
  Lock,
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
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100/60 pb-20">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fintech-emerald-600 font-bold text-white shadow-md shadow-emerald-600/20">
              EZ
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                EZ<span className="text-fintech-emerald-600">FINANZ</span>
              </span>
              <span className="ml-2 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                Chunk 2 Ready
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="success" className="gap-1.5 px-3 py-1 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Modular Architecture Active
            </Badge>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="mx-auto max-w-5xl px-6 pt-12 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-4 py-1.5 text-xs font-medium text-emerald-800 mb-6 shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-fintech-emerald-600" />
          FinTech Platform Foundation & Base Architecture
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
          Engineered for <span className="text-fintech-emerald-600">Secure & Scalable</span>{' '}
          Personal Lending
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-slate-600 leading-relaxed">
          Modular monolith backend (Express + TypeScript + Prisma) with standard API response
          envelopes, typed client SDK, shared Zod validation schemas, and FinTech design system.
        </p>
      </div>

      {/* Live Health Check Envelope Card */}
      <div className="mx-auto mt-10 max-w-5xl px-6">
        <HealthChecker />
      </div>

      {/* Architecture Cards */}
      <div className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-6 px-6 md:grid-cols-2">
        <Card className="border-slate-200/90 shadow-sm transition-all hover:shadow-md bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-fintech-emerald-700">
                <Smartphone className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-xs font-medium">
                Frontend Foundation
              </Badge>
            </div>
            <CardTitle className="mt-3 text-lg">Next.js 15 + Typed API Client</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Clean client architecture with typed requests, shared validations, and FinTech design
              tokens.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-fintech-emerald-600 shrink-0" />
              <span>
                <strong className="text-slate-800">Typed API Client:</strong> Standard{' '}
                <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">
                  ApiResponse&lt;T&gt;
                </code>{' '}
                envelope
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-fintech-emerald-600 shrink-0" />
              <span>
                <strong className="text-slate-800">Shared Zod Schemas:</strong> PAN, Aadhaar, Phone,
                Email & Loan rules
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-fintech-emerald-600 shrink-0" />
              <span>
                <strong className="text-slate-800">FinTech Theme:</strong> Emerald `#059669`, Navy
                Slate `#0f172a`, Amber accents
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 shadow-sm transition-all hover:shadow-md bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Server className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-xs font-medium">
                Modular Backend Monolith
              </Badge>
            </div>
            <CardTitle className="mt-3 text-lg">Express + TypeScript + Prisma</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Structured modules, centralized config loading, custom middleware, and error taxonomy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-fintech-emerald-600 shrink-0" />
              <span>
                <strong className="text-slate-800">Modular Structure:</strong>{' '}
                <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">src/modules/</code>,{' '}
                <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">src/shared/</code>,{' '}
                <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">src/prisma/</code>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-fintech-emerald-600 shrink-0" />
              <span>
                <strong className="text-slate-800">Typed Config:</strong> Strict Zod schema; no raw{' '}
                <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">process.env</code>{' '}
                outside config
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-fintech-emerald-600 shrink-0" />
              <span>
                <strong className="text-slate-800">Standard Envelope:</strong>{' '}
                <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">sendSuccess</code>{' '}
                &amp; <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">sendError</code>{' '}
                on all routes
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Planned Loan Workflow Pipeline */}
      <div className="mx-auto mt-14 max-w-5xl px-6">
        <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Application Journey Pipeline</h2>
            <p className="text-xs text-slate-500">
              Ready for upcoming customer workflow and admin approval modules.
            </p>
          </div>
          <Badge variant="secondary" className="gap-1.5 text-xs">
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
                <span className="font-mono text-xs font-bold text-fintech-emerald-600">
                  STEP {step.num}
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-emerald-600" />
              </div>
              <h3 className="mt-3 font-semibold text-sm text-slate-900">{step.title}</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
