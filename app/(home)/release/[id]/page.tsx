import { notFound } from 'next/navigation';
import Player from '@/components/common/Player';
import ReleaseDetails from '@/components/releases/ReleaseDetails';
import { getRelease, RELEASE_TYPES } from '@/lib/releases';
import type { Metadata } from 'next';

type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const release = await getRelease((await params).id);
  if (!release) notFound();
  const title = `${release.title} — ${RELEASE_TYPES[release.type]} | AudioBlocks`;
  const description = `Listen to ${release.title}, a ${RELEASE_TYPES[release.type]} on AudioBlocks.`;
  return {
    title,
    description,
    alternates: { canonical: `/release/${release.id}` },
    openGraph: {
      title,
      description,
      type: 'music.album',
      url: `/release/${release.id}`,
      images: [{ url: release.coverArt || '/logo.png', alt: release.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [release.coverArt || '/logo.png'],
    },
  };
}
export default async function ReleasePage({ params }: Props) {
  const release = await getRelease((await params).id);
  if (!release) notFound();
  return (
    <>
      <ReleaseDetails release={release} />
      <Player />
    </>
  );
}
