import { Suspense } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import { MotionConfig } from 'framer-motion';
import { Toaster } from 'sonner';
import './globals.css';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import AccessibilityAnnouncer from '@/components/AccessibilityAnnouncer';
import AnalyticsConsentBanner from '@/components/AnalyticsConsentBanner';
import AnalyticsScript from '@/components/AnalyticsScript';
import EnvCheck from '@/components/EnvCheck';
import SWRegister from '@/components/SWRegister';
import { ThemeScript } from '@/components/ThemeScript';
import RouteProgress from '@/components/ui/RouteProgress';
import PrivyAuthProvider from '@/context/PrivyAuthProvider';
import Provider from '@/context/provider';
import SentryErrorBoundary from '@/components/SentryErrorBoundary';
import type { Metadata } from 'next';
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'AudioBlocks — Stream, Earn & Collect Music NFTs',
  description:
    'AudioBlocks is a Web3 music platform where listeners stream ad-free music and earn rewards while artists upload tracks, sell NFTs, and get paid fairly.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AudioBlocks',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <ThemeScript />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {/* Issue #166: framer-motion animates via JS/WAAPI, not CSS, so the
            prefers-reduced-motion rules in globals.css don't reach it on
            their own. reducedMotion="user" makes every motion.* component
            in the app honor the OS preference automatically. */}
        <MotionConfig reducedMotion="user">
          <PrivyAuthProvider>
            <Provider>
              <SentryErrorBoundary>
                <Suspense fallback={null}>
                  <RouteProgress />
                </Suspense>
                <SWRegister />
                <EnvCheck />
                <AccessibilityAnnouncer />
                <a
                  className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-9999 focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:rounded focus:font-semibold"
                  href="#main-content"
                >
                  Skip to main content
                </a>
                <Toaster closeButton position="bottom-right" />
                {children}
                <AnalyticsConsentBanner />
                <AnalyticsScript />
              </SentryErrorBoundary>
            </Provider>
          </PrivyAuthProvider>
        </MotionConfig>
      </body>
    </html>
  );
}
