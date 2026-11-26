import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Artists',
};

export default function AllArtistsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
