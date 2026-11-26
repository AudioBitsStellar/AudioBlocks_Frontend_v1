import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import EmbedPlayer from './EmbedPlayer';
import { getApiUrl, getStreamUrl } from '@/lib/apiUrl';
import { mockSongsFixture } from '@/mocks/fixtures/songs';

interface EmbedSong {
  id: string;
  title: string;
  artist: string;
  cover: string;
  streamUrl: string;
}

async function fetchEmbedSong(id: string): Promise<EmbedSong | null> {
  try {
    const res = await fetch(getApiUrl(`embed/song/${encodeURIComponent(id)}`), {
      cache: 'no-store',
    });
    if (res.ok) {
      const json = await res.json();
      const data = json.data || json;
      if (data && data.title) {
        return {
          id: data.id || id,
          title: data.title,
          artist: typeof data.artist === 'string' ? data.artist : data.artist?.name || 'Unknown Artist',
          cover: typeof data.cover === 'string' ? data.cover : data.cover?.path || '/AFRO.jpg',
          streamUrl: data.streamUrl || getStreamUrl(id),
        };
      }
    }
  } catch {
    // Continue to fallback
  }

  // Fallback to /api/song/:id
  try {
    const res = await fetch(getApiUrl(`song/${encodeURIComponent(id)}`), {
      cache: 'no-store',
    });
    if (res.ok) {
      const json = await res.json();
      const song = json.data || json;
      if (song && song.title) {
        return {
          id: song.id,
          title: song.title,
          artist: song.artist?.name || 'Unknown Artist',
          cover: song.cover?.path || '/AFRO.jpg',
          streamUrl: getStreamUrl(song.id),
        };
      }
    }
  } catch {
    // Continue to fixture check
  }

  // Fallback to mock fixture if available
  const fixture = mockSongsFixture.find((s) => s.id === id);
  if (fixture) {
    return {
      id: fixture.id,
      title: fixture.title,
      artist: fixture.artist?.name || 'Unknown Artist',
      cover: fixture.cover.path || '/AFRO.jpg',
      streamUrl: getStreamUrl(fixture.id),
    };
  }

  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const song = await fetchEmbedSong(id);

  if (!song) {
    return {
      title: 'AudioBlocks - Embedded Player',
      robots: 'noindex, nofollow',
    };
  }

  return {
    title: `${song.title} by ${song.artist} - AudioBlocks`,
    description: `Listen to ${song.title} on AudioBlocks`,
    robots: 'noindex, nofollow',
  };
}

export default async function EmbedSongPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id) notFound();

  const song = await fetchEmbedSong(id);
  if (!song) {
    notFound();
  }

  return (
    <div className="w-full h-screen bg-transparent flex items-center justify-center p-4">
      <EmbedPlayer
        id={song.id}
        title={song.title}
        artist={song.artist}
        cover={song.cover}
        streamUrl={song.streamUrl}
      />
    </div>
  );
}
