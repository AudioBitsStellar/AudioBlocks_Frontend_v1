import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Playlist',
};

export default function PlaylistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
