import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import Provider from '@/context/provider';
import { Toaster } from 'sonner';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AudioBlocks — Stream, Earn & Collect Music NFTs',
  description:
    'AudioBlocks is a Web3 music platform where listeners stream ad-free music and earn rewards while artists upload tracks, sell NFTs, and get paid fairly.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased dark bg-black text-white`}
      >
        <Provider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-9999 focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:rounded focus:font-semibold"
          >
            Skip to main content
          </a>
          <Toaster position="bottom-right" closeButton />
          {children}
        </Provider>
      </body>
    </html>
  );
}
