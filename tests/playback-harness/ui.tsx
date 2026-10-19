import React from 'react';
import { createRoot } from 'react-dom/client';
import WalletHelpPage from '@/app/(home)/help/wallet/page';
import TrackList from '@/components/music/TrackList';
import ReleaseDetails from '@/components/releases/ReleaseDetails';
import { PlaybackProvider } from '@/context/PlaybackContext';
import '@/app/globals.css';
const view = new URLSearchParams(location.search).get('view');
const release = {
  id: 'fixture-ep',
  title: 'Midnight Sessions',
  type: 'ep' as const,
  artistId: 'artist',
  artist: { name: 'Demo Artist' },
  coverArt: '/AFRO.jpg',
  releaseDate: '2026-01-15',
  tracks: [
    {
      trackNumber: 1,
      song: {
        id: 'a',
        title: 'Opening Notes',
        artist: 'Demo Artist',
        duration: 183,
        status: 'ready',
        hlsMasterUrl: 'fixture',
      },
    },
    {
      trackNumber: 2,
      song: {
        id: 'b',
        title: 'After Hours',
        artist: 'Demo Artist',
        duration: 212,
        status: 'ready',
        hlsMasterUrl: 'fixture',
      },
    },
  ],
};
createRoot(document.getElementById('root')!).render(
  <PlaybackProvider>
    <main className="min-h-screen bg-background text-foreground">
      {view === 'release' ? (
        <ReleaseDetails release={release} />
      ) : view === 'unavailable' ? (
        <div className="mx-auto max-w-3xl p-6">
          <h1 className="mb-6 text-3xl font-bold">My playlist</h1>
          <TrackList
            tracks={[
              {
                id: 'one',
                title: 'Opening Notes',
                artist: 'Demo Artist',
                cover: '',
                duration: 183,
              },
              {
                id: 'two',
                title: 'Removed song',
                artist: 'Demo Artist',
                cover: '',
                duration: 212,
                available: false,
              },
            ]}
          />
        </div>
      ) : (
        <WalletHelpPage />
      )}
    </main>
  </PlaybackProvider>
);
