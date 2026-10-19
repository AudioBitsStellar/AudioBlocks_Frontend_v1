import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AudioBlocks - Embedded Player',
  description: 'Listen to your favorite songs on AudioBlocks',
  robots: 'noindex, nofollow',
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
