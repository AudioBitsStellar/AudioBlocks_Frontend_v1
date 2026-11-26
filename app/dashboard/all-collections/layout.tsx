import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Collections',
};

export default function AllCollectionsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
