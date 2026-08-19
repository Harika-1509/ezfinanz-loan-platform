'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiClient, ApiResponse } from '@/lib/api-client';
import { Activity, RefreshCw, CheckCircle2, AlertCircle, Clock, Server, Cpu } from 'lucide-react';

interface HealthData {
  status: string;
  service: string;
  uptime: number;
  timestamp: string;
  environment: string;
  version: string;
  memory?: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
}

export function HealthChecker() {
  const [response, setResponse] = useState<ApiResponse<HealthData> | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchHealth = async () => {
    setError(null);
    const startTime = performance.now();
    try {
      const result = await apiClient.get<HealthData>('/health');
      const endTime = performance.now();
      setLatency(Math.round(endTime - startTime));
      setResponse(result);
    } catch (err: any) {
      const endTime = performance.now();
      setLatency(Math.round(endTime - startTime));
      setError(err.message || 'Failed to connect to backend service');
      setResponse(null);
    }
  };

  useEffect(() => {
    startTransition(() => {
      fetchHealth();
    });
  }, []);

  return (
    <Card className="border-slate-200/90 shadow-sm transition-all hover:shadow-md bg-white">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">
                Backend Service Live Status
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Standard API Response Envelope Verification
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => startTransition(fetchHealth)}
            disabled={isPending}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
            {isPending ? 'Checking...' : 'Recheck'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error ? (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/80 p-3.5 text-sm text-red-800">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Connection Failed</p>
              <p className="text-xs text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
        ) : response?.success ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  Service
                </span>
                <p className="mt-0.5 text-xs font-semibold text-slate-800 truncate">
                  {response.data?.service || 'ezfinanz-api'}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  Status
                </span>
                <div className="mt-0.5 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-emerald-700 capitalize">
                    {response.data?.status || 'Online'}
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  Latency
                </span>
                <p className="mt-0.5 text-xs font-semibold text-slate-800">
                  {latency !== null ? `${latency} ms` : '—'}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  Uptime
                </span>
                <p className="mt-0.5 text-xs font-semibold text-slate-800">
                  {response.data?.uptime ? `${response.data.uptime}s` : '0s'}
                </p>
              </div>
            </div>

            {/* Envelope Details Accordion / View */}
            <div className="rounded-lg border border-slate-200/80 bg-slate-900 p-3 text-white">
              <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-1.5 mb-2">
                <span className="font-mono">Standard API Envelope Response</span>
                <Badge
                  variant="outline"
                  className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-950/40"
                >
                  200 OK
                </Badge>
              </div>
              <pre className="font-mono text-[11px] leading-relaxed text-emerald-400 overflow-x-auto">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-6 text-sm text-slate-500 gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
            Connecting to backend at {apiClient.getBaseUrl()}...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
