import React from 'react';
import { createRoot } from 'react-dom/client';
import { PlaybackProvider, usePlayback } from '@/context/PlaybackContext';
import { useQueuedAudio } from '@/hooks/useQueuedAudio';
const tracks = ['one', 'two', 'three'].map((id) => ({
  id,
  title: id,
  artist: 'Fixture',
  cover: '',
}));
function Harness() {
  const { deckARef, deckBRef } = useQueuedAudio();
  const { playTracks, addToQueue, playlist, currentIndex, setCrossfadeDuration } = usePlayback();
  return (
    <>
      <h1>Playback regression harness</h1>
      <p data-testid="track">{playlist[currentIndex]?.id}</p>
      <button
        onClick={() => {
          playTracks([tracks[0]]);
          addToQueue(tracks[1]);
        }}
      >
        Start
      </button>
      <button onClick={() => addToQueue(tracks[2], 'next')}>Change queue</button>
      <button onClick={() => setCrossfadeDuration(1)}>Crossfade</button>
      <audio ref={deckARef} data-testid="deck-a" />
      <audio ref={deckBRef} data-testid="deck-b" />
    </>
  );
}
createRoot(document.getElementById('root')!).render(
  <PlaybackProvider>
    <Harness />
  </PlaybackProvider>
);
