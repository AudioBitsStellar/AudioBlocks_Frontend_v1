import { notFound } from 'next/navigation';
import Player from '@/components/common/Player';
import { JsonLdScript } from '@/components/JsonLdScript';
import ReleaseDetails from '@/components/releases/ReleaseDetails';
import { generateReleaseJsonLd } from '@/lib/jsonld';
import { getRelease, RELEASE_TYPES } from '@/lib/releases';
import type { Metadata } from 'next';

/**
 * #830 (PERF-05): Cache public release/song detail pages with ISR (5-minute revalidation).
 */
export const revalidate = 300;

type Props = { params: Promise<{ id: string }> };

const DEFAULT_OG_IMAGE = '/logo.png';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const release = await getRelease((await params).id);
  if (!release) notFound();
  const title = `${release.title} — ${RELEASE_TYPES[release.type]} | AudioBlocks`;
  const description = `Listen to ${release.title}, a ${RELEASE_TYPES[release.type]} on AudioBlocks.`;
  const image = release.coverArt || DEFAULT_OG_IMAGE;
  return {
    title,
    description,
    alternates: { canonical: `/release/${release.id}` },
    openGraph: {
      title,
      description,
      type: 'music.album',
      url: `/release/${release.id}`,
      images: [{ url: image, width: 1200, height: 630, alt: release.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}
export default async function ReleasePage({ params }: Props) {
  const release = await getRelease((await params).id);
  if (!release) notFound();
  const artistName = release.artist?.name || release.artist?.username || 'Unknown artist';
  const jsonLd = generateReleaseJsonLd({
    id: release.id,
    title: release.title,
    releaseType: RELEASE_TYPES[release.type],
    artist: artistName,
    artistId: release.artistId,
    coverImage: release.coverArt,
    url: `/release/${release.id}`,
    releaseDate: release.releaseDate,
    tracks: release.tracks
      .filter((track) => track.song)
      .map((track) => ({
        title: track.song!.title,
        trackNumber: track.trackNumber,
      })),
  });
  return (
    <>
      <JsonLdScript data={jsonLd} id="release-jsonld" />
      <ReleaseDetails release={release} />
      <Player />
    </>
  );
}
