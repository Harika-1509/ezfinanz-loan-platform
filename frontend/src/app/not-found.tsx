import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-200 dark:border-slate-800 text-center">
        <CardContent className="pt-8 pb-8 space-y-6">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
            <FileQuestion className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Page Not Found
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              The loan application page or resource you are looking for does not exist or has been
              moved.
            </p>
          </div>

          <Link href="/" className="inline-block w-full">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
              <Home className="w-4 h-4 mr-2" /> Return to Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
