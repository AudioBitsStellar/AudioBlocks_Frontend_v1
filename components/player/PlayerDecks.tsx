'use client';

import { type RefObject } from 'react';

interface PlayerDecksProps {
  deckARef: RefObject<HTMLAudioElement | null>;
  deckBRef: RefObject<HTMLAudioElement | null>;
  isCrossfading: boolean;
}

export function PlayerDecks({ deckARef, deckBRef, isCrossfading }: PlayerDecksProps) {
  return (
    <>
      <audio ref={deckARef} aria-hidden="true" data-audio-deck="a" preload="none" />
      <audio ref={deckBRef} aria-hidden="true" data-audio-deck="b" preload="none" />
      <span className="sr-only" data-crossfading={isCrossfading ? 'true' : 'false'} />
    </>
  );
}
