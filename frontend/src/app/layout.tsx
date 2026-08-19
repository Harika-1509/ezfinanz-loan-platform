import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../contexts/auth-context';
import { Navbar } from '../components/layout/navbar';
import { Footer } from '../components/layout/footer';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'EZFinanz | Instant Personal Loans & Digital Underwriting',
  description:
    'Seamless, instant personal loan platform with automated eligibility calculation, dynamic EMI tenure selection, dual 2FA verification, and rapid disbursement.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-emerald-500 selection:text-white dark:bg-slate-950 dark:text-slate-100 flex flex-col">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
